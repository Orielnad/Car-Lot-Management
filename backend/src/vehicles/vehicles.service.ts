import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { VehicleStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleStatusDto } from './dto/update-vehicle-status.dto';
import { SetListPriceDto } from './dto/set-list-price.dto';
import { CreateExpenseDto } from './dto/create-expense.dto';
import {
  assertValidVehicleTransition,
  InvalidVehicleTransitionError,
  MissingListPriceError,
} from './vehicle-status';

@Injectable()
export class VehiclesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async findAll() {
    return this.prisma.vehicle.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id, deletedAt: null },
      include: { expenses: true },
    });
    if (!vehicle) {
      throw new NotFoundException('הרכב לא נמצא.');
    }
    return vehicle;
  }

  async create(dto: CreateVehicleDto, actorId: string) {
    await this.assertNoDuplicate(dto.licensePlate, dto.vin);

    const vehicle = await this.prisma.vehicle.create({
      data: {
        branchId: dto.branchId,
        licensePlate: dto.licensePlate,
        vin: dto.vin,
        manufacturer: dto.manufacturer,
        model: dto.model,
        year: dto.year,
        mileageKm: dto.mileageKm,
        color: dto.color,
        bodyType: dto.bodyType,
        gearbox: dto.gearbox,
        fuelType: dto.fuelType,
        purchasePrice: dto.purchasePrice,
        status: VehicleStatus.CANDIDATE,
      },
    });

    await this.prisma.vehicleEvent.create({
      data: {
        vehicleId: vehicle.id,
        eventType: 'CREATED',
        actorId,
      },
    });

    await this.auditLog.record({
      entityType: 'Vehicle',
      entityId: vehicle.id,
      actorId,
      action: 'CREATE',
      after: vehicle,
    });

    return vehicle;
  }

  async updateStatus(
    id: string,
    dto: UpdateVehicleStatusDto,
    actorId: string,
  ) {
    const vehicle = await this.findOne(id);

    this.checkTransitionOrThrowHttp(vehicle.status, dto.status, vehicle.listPrice !== null);

    // updateMany (not update) because Prisma's update() only accepts a
    // unique field in `where` — combining id + version for a real,
    // race-safe optimistic-lock check needs the non-unique-filter form.
    const { count } = await this.prisma.vehicle.updateMany({
      where: { id, version: dto.version, deletedAt: null },
      data: { status: dto.status, version: { increment: 1 } },
    });

    if (count === 0) {
      throw new ConflictException(
        'מישהו אחר עדכן את הרכב הזה בינתיים. יש לרענן ולנסות שוב.',
      );
    }

    const updated = await this.findOne(id);

    await this.prisma.vehicleEvent.create({
      data: {
        vehicleId: id,
        eventType: 'STATUS_CHANGED',
        fieldChanged: 'status',
        oldValue: vehicle.status,
        newValue: dto.status,
        actorId,
      },
    });

    await this.auditLog.record({
      entityType: 'Vehicle',
      entityId: id,
      actorId,
      action: 'STATUS_CHANGE',
      before: { status: vehicle.status },
      after: { status: dto.status },
    });

    return updated;
  }

  async setListPrice(id: string, dto: SetListPriceDto, actorId: string) {
    const vehicle = await this.findOne(id);

    const { count } = await this.prisma.vehicle.updateMany({
      where: { id, version: dto.version, deletedAt: null },
      data: { listPrice: dto.listPrice, version: { increment: 1 } },
    });

    if (count === 0) {
      throw new ConflictException(
        'מישהו אחר עדכן את הרכב הזה בינתיים. יש לרענן ולנסות שוב.',
      );
    }

    const updated = await this.findOne(id);

    await this.prisma.vehicleEvent.create({
      data: {
        vehicleId: id,
        eventType: 'PRICE_CHANGED',
        fieldChanged: 'listPrice',
        oldValue: vehicle.listPrice?.toString() ?? null,
        newValue: dto.listPrice.toString(),
        actorId,
      },
    });

    await this.auditLog.record({
      entityType: 'Vehicle',
      entityId: id,
      actorId,
      action: 'PRICE_CHANGE',
      before: { listPrice: vehicle.listPrice },
      after: { listPrice: dto.listPrice },
    });

    return updated;
  }

  async addExpense(vehicleId: string, dto: CreateExpenseDto, actorId: string) {
    await this.findOne(vehicleId);

    const expense = await this.prisma.expense.create({
      data: {
        vehicleId,
        category: dto.category,
        amount: dto.amount,
        description: dto.description,
        createdBy: actorId,
      },
    });

    await this.auditLog.record({
      entityType: 'Expense',
      entityId: expense.id,
      actorId,
      action: 'CREATE',
      after: expense,
    });

    return expense;
  }

  async getEvents(vehicleId: string) {
    await this.findOne(vehicleId);
    return this.prisma.vehicleEvent.findMany({
      where: { vehicleId },
      orderBy: { createdAt: 'asc' },
    });
  }

  private async assertNoDuplicate(licensePlate?: string, vin?: string) {
    if (!licensePlate && !vin) {
      return;
    }

    const orConditions: Array<{ licensePlate: string } | { vin: string }> = [];
    if (licensePlate) orConditions.push({ licensePlate });
    if (vin) orConditions.push({ vin });

    const existing = await this.prisma.vehicle.findFirst({
      where: {
        deletedAt: null,
        OR: orConditions,
      },
    });

    if (existing) {
      throw new BadRequestException(
        'כבר קיים רכב במלאי עם אותו מספר רישוי או מספר שלדה (VIN).',
      );
    }
  }

  /**
   * assertValidVehicleTransition() is framework-agnostic (see
   * vehicle-status.ts) and throws plain Error subclasses, not NestJS
   * HttpExceptions — this is the one place that translates them into a
   * proper 400 response instead of letting them fall through as a generic,
   * unhelpful 500.
   */
  private checkTransitionOrThrowHttp(
    currentStatus: VehicleStatus,
    nextStatus: VehicleStatus,
    hasListPrice: boolean,
  ): void {
    try {
      assertValidVehicleTransition({ currentStatus, nextStatus, hasListPrice });
    } catch (error) {
      if (
        error instanceof InvalidVehicleTransitionError ||
        error instanceof MissingListPriceError
      ) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}
