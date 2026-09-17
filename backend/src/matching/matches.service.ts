import { Injectable } from '@nestjs/common';
import { Prisma, RoleName, VehicleStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LeadActor, LeadsService } from '../leads/leads.service';
import { computeMatchScore, LeadPreferences } from './match-score';

@Injectable()
export class MatchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leadsService: LeadsService,
  ) {}

  /**
   * Recomputes match scores between one lead and every AVAILABLE vehicle,
   * and upserts the results (see docs/data-model.md — matches are computed,
   * not user-entered, so there's no history to preserve).
   */
  async recomputeForLead(leadId: string, actor: LeadActor) {
    const lead = await this.leadsService.findOne(leadId, actor);
    const preferences = (lead.preferences ?? {}) as LeadPreferences;

    const vehicles = await this.prisma.vehicle.findMany({
      where: { status: VehicleStatus.AVAILABLE, deletedAt: null },
    });

    const results = await Promise.all(
      vehicles.map(async (vehicle) => {
        const { score, explanation } = computeMatchScore(preferences, {
          manufacturer: vehicle.manufacturer,
          model: vehicle.model,
          year: vehicle.year,
          mileageKm: vehicle.mileageKm,
          listPrice: vehicle.listPrice ? Number(vehicle.listPrice) : null,
          bodyType: vehicle.bodyType,
          gearbox: vehicle.gearbox,
          fuelType: vehicle.fuelType,
          color: vehicle.color,
        });

        return this.prisma.match.upsert({
          where: { leadId_vehicleId: { leadId, vehicleId: vehicle.id } },
          create: {
            leadId,
            vehicleId: vehicle.id,
            score,
            explanation: explanation as unknown as Prisma.InputJsonValue,
          },
          update: {
            score,
            explanation: explanation as unknown as Prisma.InputJsonValue,
          },
        });
      }),
    );

    return results.sort((a, b) => b.score - a.score);
  }

  async findForLead(leadId: string, actor: LeadActor) {
    await this.leadsService.findOne(leadId, actor); // enforces row-level access
    return this.prisma.match.findMany({
      where: { leadId },
      orderBy: { score: 'desc' },
    });
  }

  /**
   * The reverse direction (spec 6: "התאמה דו-כיוונית") — which leads are a
   * good fit for a given vehicle. Open to inventory/sales-management roles
   * rather than row-scoped, since a vehicle isn't owned by one salesperson.
   */
  async findForVehicle(vehicleId: string) {
    return this.prisma.match.findMany({
      where: { vehicleId },
      orderBy: { score: 'desc' },
    });
  }
}

export const CAN_VIEW_VEHICLE_MATCHES: RoleName[] = [
  RoleName.OWNER,
  RoleName.SALES_MANAGER,
  RoleName.INVENTORY_MANAGER,
];
