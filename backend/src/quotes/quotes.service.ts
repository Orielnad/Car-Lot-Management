import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { QuoteStatus, RoleName } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { LeadActor, LeadsService } from '../leads/leads.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteStatusDto } from './dto/update-quote-status.dto';
import { assertValidQuoteTransition, InvalidQuoteTransitionError } from './quote-status';

/** A discount above this share of the price needs manager/owner approval — spec 7.1. */
const DISCOUNT_APPROVAL_THRESHOLD = 0.1;
const CAN_APPROVE_LARGE_DISCOUNT: RoleName[] = [RoleName.OWNER, RoleName.SALES_MANAGER];
const REVISABLE_STATUSES: QuoteStatus[] = [
  QuoteStatus.DRAFT,
  QuoteStatus.SENT,
  QuoteStatus.VIEWED,
];

@Injectable()
export class QuotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leadsService: LeadsService,
    private readonly auditLog: AuditLogService,
  ) {}

  async findAllForLead(leadId: string, actor: LeadActor) {
    await this.leadsService.findOne(leadId, actor); // enforces row-level access
    return this.prisma.quote.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, actor: LeadActor) {
    const quote = await this.prisma.quote.findFirst({ where: { id } });
    if (!quote) {
      throw new NotFoundException('הצעת המחיר לא נמצאה.');
    }
    await this.leadsService.findOne(quote.leadId, actor); // row-level access
    return quote;
  }

  async create(leadId: string, dto: CreateQuoteDto, actor: LeadActor) {
    await this.leadsService.findOne(leadId, actor); // row-level access
    this.assertDiscountAllowed(dto.price, dto.discount ?? 0, actor);

    const quote = await this.prisma.quote.create({
      data: {
        leadId,
        vehicleId: dto.vehicleId,
        price: dto.price,
        discount: dto.discount ?? 0,
        validUntil: new Date(dto.validUntil),
        createdBy: actor.userId,
      },
    });

    await this.auditLog.record({
      entityType: 'Quote',
      entityId: quote.id,
      actorId: actor.userId,
      action: 'CREATE',
      after: quote,
    });

    return quote;
  }

  /** Creates a new quote row that supersedes an existing one — never edits it in place. */
  async revise(quoteId: string, dto: CreateQuoteDto, actor: LeadActor) {
    const previous = await this.findOne(quoteId, actor);

    if (!REVISABLE_STATUSES.includes(previous.status)) {
      throw new BadRequestException(
        'לא ניתן לערוך הצעת מחיר סגורה (אושרה/נדחתה/פגה) — יש ליצור הצעה חדשה.',
      );
    }

    this.assertDiscountAllowed(dto.price, dto.discount ?? 0, actor);

    const revised = await this.prisma.quote.create({
      data: {
        leadId: previous.leadId,
        vehicleId: dto.vehicleId,
        price: dto.price,
        discount: dto.discount ?? 0,
        validUntil: new Date(dto.validUntil),
        createdBy: actor.userId,
        supersedesId: previous.id,
      },
    });

    await this.auditLog.record({
      entityType: 'Quote',
      entityId: revised.id,
      actorId: actor.userId,
      action: 'REVISE',
      before: { supersedes: previous.id },
      after: revised,
    });

    return revised;
  }

  async updateStatus(id: string, dto: UpdateQuoteStatusDto, actor: LeadActor) {
    const quote = await this.findOne(id, actor);

    try {
      assertValidQuoteTransition(quote.status, dto.status);
    } catch (error) {
      if (error instanceof InvalidQuoteTransitionError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }

    const { count } = await this.prisma.quote.updateMany({
      where: { id, version: dto.version },
      data: { status: dto.status, version: { increment: 1 } },
    });

    if (count === 0) {
      throw new ConflictException(
        'מישהו אחר עדכן את הצעת המחיר הזו בינתיים. יש לרענן ולנסות שוב.',
      );
    }

    const updated = await this.prisma.quote.findFirst({ where: { id } });

    await this.auditLog.record({
      entityType: 'Quote',
      entityId: id,
      actorId: actor.userId,
      action: 'STATUS_CHANGE',
      before: { status: quote.status },
      after: { status: dto.status },
    });

    return updated;
  }

  private assertDiscountAllowed(price: number, discount: number, actor: LeadActor): void {
    if (discount >= price) {
      throw new BadRequestException('ההנחה לא יכולה להיות גדולה או שווה למחיר.');
    }

    const discountRatio = discount / price;
    const canApproveLargeDiscount = actor.roles.some((role) =>
      CAN_APPROVE_LARGE_DISCOUNT.includes(role),
    );

    if (discountRatio > DISCOUNT_APPROVAL_THRESHOLD && !canApproveLargeDiscount) {
      throw new ForbiddenException(
        `הנחה מעל ${DISCOUNT_APPROVAL_THRESHOLD * 100}% דורשת אישור מנהל מכירות או בעלים.`,
      );
    }
  }
}
