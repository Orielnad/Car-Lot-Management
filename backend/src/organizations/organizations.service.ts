import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * MVP scope is a single car lot (one Organization) with several branches
 * under it (see docs/architecture.md). This service is the one place that
 * resolves "the" organization, so that assumption is easy to remove later
 * without hunting through every module that needs an organizationId.
 */
@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDefaultOrganizationId(): Promise<string> {
    const organization = await this.prisma.organization.findFirst({
      where: { deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });

    if (!organization) {
      throw new InternalServerErrorException(
        'לא נמצא ארגון במערכת. יש להריץ את סקריפט ה-Seed לפני השימוש.',
      );
    }

    return organization.id;
  }
}
