import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DealStatus, Prisma, RoleName, VehicleStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { LeadActor, LeadsService } from '../leads/leads.service';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealStatusDto } from './dto/update-deal-status.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import {
  assertValidDealTransition,
  DeliveryBlockedError,
  InvalidDealTransitionError,
} from './deal-status';
import {
  assertValidVehicleTransition,
  InvalidVehicleTransitionError,
} from '../vehicles/vehicle-status';

// Per docs/permissions.md, Finance also has view access to every deal
// (cost/profit visibility), not just their own — simplified here to share
// the same "sees everything" set as management rather than modeling
// view-only vs. edit separately for a role that won't touch deal status.
const CAN_SEE_ALL_DEALS: RoleName[] = [
  RoleName.OWNER,
  RoleName.SALES_MANAGER,
  RoleName.FINANCE,
];
const CAN_RECORD_PAYMENTS: RoleName[] = [
  RoleName.OWNER,
  RoleName.SALES_MANAGER,
  RoleName.FINANCE,
];
const VEHICLE_ELIGIBLE_STATUSES: VehicleStatus[] = [
  VehicleStatus.AVAILABLE,
  VehicleStatus.RESERVED,
];

/** Deal status -> the vehicle status that should follow it, if any. */
const VEHICLE_STATUS_FOR_DEAL_STATUS: Partial<Record<DealStatus, VehicleStatus>> = {
  [DealStatus.PAID]: VehicleStatus.SOLD,
  [DealStatus.DELIVERED]: VehicleStatus.DELIVERED,
  [DealStatus.CANCELLED]: VehicleStatus.AVAILABLE,
};

function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
  );
}

@Injectable()
export class DealsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leadsService: LeadsService,
    private readonly auditLog: AuditLogService,
  ) {}

  async findAll(actor: LeadActor) {
    const canSeeAll = actor.roles.some((role) => CAN_SEE_ALL_DEALS.includes(role));
    return this.prisma.deal.findMany({
      where: canSeeAll ? {} : { salespersonId: actor.userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, actor: LeadActor) {
    const deal = await this.prisma.deal.findFirst({ where: { id } });
    if (!deal) {
      throw new NotFoundException('העסקה לא נמצאה.');
    }
    this.assertCanAccess(deal.salespersonId, actor);
    return deal;
  }

  /**
   * Creates a deal from an APPROVED quote. The vehicle-side "no double
   * sale" guarantee comes from a partial unique index in the database
   * (migration `add_deals_payments`) — the pre-checks here are for a fast,
   * friendly error in the common case, but the transaction + index are
   * what actually make this safe under concurrent requests.
   */
  async create(dto: CreateDealDto, actor: LeadActor) {
    const quote = await this.prisma.quote.findFirst({ where: { id: dto.quoteId } });
    if (!quote) {
      throw new NotFoundException('הצעת המחיר לא נמצאה.');
    }

    const lead = await this.leadsService.findOne(quote.leadId, actor); // row-level access

    if (quote.status !== 'APPROVED') {
      throw new BadRequestException('ניתן ליצור עסקה רק מהצעת מחיר שאושרה.');
    }

    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: quote.vehicleId, deletedAt: null },
    });
    if (!vehicle) {
      throw new NotFoundException('הרכב לא נמצא.');
    }
    if (!VEHICLE_ELIGIBLE_STATUSES.includes(vehicle.status)) {
      throw new BadRequestException('הרכב אינו זמין ליצירת עסקה חדשה.');
    }

    const salePrice = Number(quote.price) - Number(quote.discount);

    try {
      const deal = await this.prisma.$transaction(async (tx) => {
        const created = await tx.deal.create({
          data: {
            quoteId: quote.id,
            customerId: lead.customerId,
            vehicleId: quote.vehicleId,
            salespersonId: lead.ownerUserId,
            salePrice,
          },
        });

        const { count } = await tx.vehicle.updateMany({
          where: { id: vehicle.id, version: vehicle.version, deletedAt: null },
          data: { status: VehicleStatus.IN_DEAL, version: { increment: 1 } },
        });
        if (count === 0) {
          throw new ConflictException(
            'הרכב עודכן בינתיים על ידי מישהו אחר. יש לרענן ולנסות שוב.',
          );
        }

        await tx.vehicleEvent.create({
          data: {
            vehicleId: vehicle.id,
            eventType: 'STATUS_CHANGED',
            fieldChanged: 'status',
            oldValue: vehicle.status,
            newValue: VehicleStatus.IN_DEAL,
            actorId: actor.userId,
          },
        });

        return created;
      });

      await this.auditLog.record({
        entityType: 'Deal',
        entityId: deal.id,
        actorId: actor.userId,
        action: 'CREATE',
        after: deal,
      });

      return deal;
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException(
          'הרכב הזה כבר נמכר בעסקה פעילה אחרת, או שכבר קיימת עסקה להצעת המחיר הזו.',
        );
      }
      throw error;
    }
  }

  async updateStatus(id: string, dto: UpdateDealStatusDto, actor: LeadActor) {
    const deal = await this.findOne(id, actor);

    const totalPaid = await this.getTotalPaid(id);

    try {
      assertValidDealTransition({
        currentStatus: deal.status,
        nextStatus: dto.status,
        totalPaid,
        salePrice: Number(deal.salePrice),
      });
    } catch (error) {
      if (error instanceof InvalidDealTransitionError || error instanceof DeliveryBlockedError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.deal.updateMany({
        where: { id, version: dto.version },
        data: { status: dto.status, version: { increment: 1 } },
      });
      if (count === 0) {
        throw new ConflictException(
          'מישהו אחר עדכן את העסקה הזו בינתיים. יש לרענן ולנסות שוב.',
        );
      }

      const mappedVehicleStatus = VEHICLE_STATUS_FOR_DEAL_STATUS[dto.status];
      if (mappedVehicleStatus) {
        await this.syncVehicleStatus(tx, deal.vehicleId, mappedVehicleStatus, actor.userId);
      }

      return tx.deal.findFirst({ where: { id } });
    });

    await this.auditLog.record({
      entityType: 'Deal',
      entityId: id,
      actorId: actor.userId,
      action: 'STATUS_CHANGE',
      before: { status: deal.status },
      after: { status: dto.status },
    });

    return updated;
  }

  async addPayment(dealId: string, dto: CreatePaymentDto, actor: LeadActor) {
    await this.assertCanAccessForPayment(dealId, actor);

    const payment = await this.prisma.payment.create({
      data: {
        dealId,
        amount: dto.amount,
        method: dto.method,
        reference: dto.reference,
        createdBy: actor.userId,
      },
    });

    await this.auditLog.record({
      entityType: 'Payment',
      entityId: payment.id,
      actorId: actor.userId,
      action: 'CREATE',
      after: payment,
    });

    return payment;
  }

  async listPayments(dealId: string, actor: LeadActor) {
    await this.assertCanAccessForPayment(dealId, actor);
    return this.prisma.payment.findMany({
      where: { dealId },
      orderBy: { createdAt: 'asc' },
    });
  }

  private async getTotalPaid(dealId: string): Promise<number> {
    const result = await this.prisma.payment.aggregate({
      where: { dealId },
      _sum: { amount: true },
    });
    return Number(result._sum.amount ?? 0);
  }

  private async syncVehicleStatus(
    tx: Prisma.TransactionClient,
    vehicleId: string,
    nextStatus: VehicleStatus,
    actorId: string,
  ): Promise<void> {
    const vehicle = await tx.vehicle.findFirst({ where: { id: vehicleId } });
    if (!vehicle) {
      return;
    }

    try {
      assertValidVehicleTransition({
        currentStatus: vehicle.status,
        nextStatus,
        hasListPrice: vehicle.listPrice !== null,
      });
    } catch (error) {
      if (error instanceof InvalidVehicleTransitionError) {
        // The vehicle already moved on its own (e.g. already DELIVERED) —
        // don't fail the deal update over a side effect that's now a no-op.
        return;
      }
      throw error;
    }

    await tx.vehicle.update({
      where: { id: vehicleId },
      data: { status: nextStatus, version: { increment: 1 } },
    });

    await tx.vehicleEvent.create({
      data: {
        vehicleId,
        eventType: 'STATUS_CHANGED',
        fieldChanged: 'status',
        oldValue: vehicle.status,
        newValue: nextStatus,
        actorId,
      },
    });
  }

  private assertCanAccess(salespersonId: string, actor: LeadActor): void {
    const canSeeAll = actor.roles.some((role) => CAN_SEE_ALL_DEALS.includes(role));
    if (!canSeeAll && salespersonId !== actor.userId) {
      throw new ForbiddenException('העסקה הזו שייכת לעובד אחר.');
    }
  }

  /**
   * Per docs/permissions.md, Payments are Owner/SalesManager/Finance only —
   * a salesperson has no access to this data at all, even for their own
   * deal, unlike every other row-level check in this service.
   */
  private async assertCanAccessForPayment(
    dealId: string,
    actor: LeadActor,
  ): Promise<void> {
    const deal = await this.prisma.deal.findFirst({ where: { id: dealId } });
    if (!deal) {
      throw new NotFoundException('העסקה לא נמצאה.');
    }

    const canAccessPayments = actor.roles.some((role) =>
      CAN_RECORD_PAYMENTS.includes(role),
    );
    if (!canAccessPayments) {
      throw new ForbiddenException(
        'אין לך הרשאה לצפות בתשלומים — רק כספים, מנהל מכירות או בעלים.',
      );
    }
  }
}

export { CAN_RECORD_PAYMENTS };
