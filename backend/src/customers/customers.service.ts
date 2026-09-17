import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateCustomerDto } from './dto/create-customer.dto';

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async findAll() {
    return this.prisma.customer.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, deletedAt: null },
    });
    if (!customer) {
      throw new NotFoundException('הלקוח לא נמצא.');
    }
    return customer;
  }

  async create(dto: CreateCustomerDto, actorId: string) {
    const existing = await this.prisma.customer.findFirst({
      where: { phone: dto.phone, deletedAt: null },
    });
    if (existing) {
      throw new BadRequestException(
        `כבר קיים לקוח עם מספר הטלפון הזה: ${existing.fullName}. יש להשתמש בכרטיס הקיים במקום ליצור כפילות.`,
      );
    }

    const customer = await this.prisma.customer.create({
      data: {
        fullName: dto.fullName,
        phone: dto.phone,
        email: dto.email,
        city: dto.city,
        marketingConsent: dto.marketingConsent ?? false,
      },
    });

    await this.auditLog.record({
      entityType: 'Customer',
      entityId: customer.id,
      actorId,
      action: 'CREATE',
      after: customer,
    });

    return customer;
  }
}
