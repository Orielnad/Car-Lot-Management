import { Injectable } from '@nestjs/common';
import { DealStatus, LeadStatus, VehicleStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { averageAgeDays, conversionRate, toNumberOrZero } from './report-math';

const ACTIVE_VEHICLE_STATUSES: VehicleStatus[] = [
  VehicleStatus.CANDIDATE,
  VehicleStatus.INTAKE,
  VehicleStatus.RECONDITIONING,
  VehicleStatus.AVAILABLE,
  VehicleStatus.RESERVED,
  VehicleStatus.IN_DEAL,
];
const COUNTED_REVENUE_STATUSES: DealStatus[] = [
  DealStatus.PAID,
  DealStatus.READY_FOR_DELIVERY,
  DealStatus.DELIVERED,
];

interface LeadActorLike {
  userId: string;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /** ראו docs/permissions.md: מלאי — Owner/SalesManager/InventoryManager/Finance/Viewer. */
  async getInventoryReport() {
    const byStatus = await this.prisma.vehicle.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: { _all: true },
    });

    const available = await this.prisma.vehicle.aggregate({
      where: { status: VehicleStatus.AVAILABLE, deletedAt: null },
      _sum: { listPrice: true },
      _count: { _all: true },
    });

    const activeVehicles = await this.prisma.vehicle.findMany({
      where: { status: { in: ACTIVE_VEHICLE_STATUSES }, deletedAt: null },
      select: { createdAt: true },
    });

    return {
      countByStatus: Object.fromEntries(
        byStatus.map((row) => [row.status, row._count._all]),
      ),
      availableVehicleCount: available._count._all,
      availableInventoryValue: toNumberOrZero(available._sum.listPrice),
      averageAgeDaysInStock: averageAgeDays(activeVehicles.map((v) => v.createdAt)),
    };
  }

  /** ראו docs/permissions.md: מכירות — Owner/SalesManager/Finance. */
  async getSalesReport() {
    const byStatus = await this.prisma.deal.groupBy({
      by: ['status'],
      _count: { _all: true },
    });

    const revenue = await this.prisma.deal.aggregate({
      where: { status: { in: COUNTED_REVENUE_STATUSES } },
      _sum: { salePrice: true },
      _count: { _all: true },
      _avg: { salePrice: true },
    });

    return {
      countByStatus: Object.fromEntries(
        byStatus.map((row) => [row.status, row._count._all]),
      ),
      countedDealsForRevenue: revenue._count._all,
      totalRevenue: toNumberOrZero(revenue._sum.salePrice),
      averageSalePrice: toNumberOrZero(revenue._avg.salePrice),
    };
  }

  /** ראו docs/permissions.md: CRM — Owner/SalesManager. */
  async getLeadsReport() {
    const byStatus = await this.prisma.lead.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: { _all: true },
    });

    const bySource = await this.prisma.lead.groupBy({
      by: ['source'],
      where: { deletedAt: null },
      _count: { _all: true },
    });

    const won = byStatus.find((row) => row.status === LeadStatus.WON)?._count._all ?? 0;
    const lost = byStatus.find((row) => row.status === LeadStatus.LOST)?._count._all ?? 0;

    return {
      countByStatus: Object.fromEntries(
        byStatus.map((row) => [row.status, row._count._all]),
      ),
      countBySource: Object.fromEntries(
        bySource.map((row) => [row.source, row._count._all]),
      ),
      conversionRatePercent: conversionRate(won, lost),
    };
  }

  /**
   * ראו docs/permissions.md: "ביצועיו האישיים" — כל עובד מכירות רואה את שלו
   * בלבד, אין כאן החלטת הרשאה נוספת מעבר לסינון לפי userId של הקורא.
   */
  async getMyPerformance(actor: LeadActorLike) {
    const leadsByStatus = await this.prisma.lead.groupBy({
      by: ['status'],
      where: { ownerUserId: actor.userId, deletedAt: null },
      _count: { _all: true },
    });

    const deals = await this.prisma.deal.aggregate({
      where: { salespersonId: actor.userId, status: { in: COUNTED_REVENUE_STATUSES } },
      _sum: { salePrice: true },
      _count: { _all: true },
    });

    return {
      leadCountByStatus: Object.fromEntries(
        leadsByStatus.map((row) => [row.status, row._count._all]),
      ),
      dealsCounted: deals._count._all,
      totalRevenue: toNumberOrZero(deals._sum.salePrice),
    };
  }
}
