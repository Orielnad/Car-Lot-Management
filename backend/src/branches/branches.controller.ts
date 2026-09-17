import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { OrganizationsService } from '../organizations/organizations.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('branches')
export class BranchesController {
  constructor(
    private readonly branchesService: BranchesService,
    private readonly organizationsService: OrganizationsService,
  ) {}

  @Get()
  async findAll() {
    const organizationId = await this.organizationsService.getDefaultOrganizationId();
    return this.branchesService.findAll(organizationId);
  }

  @Post()
  @Roles(RoleName.OWNER)
  async create(
    @Body() dto: CreateBranchDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const organizationId = await this.organizationsService.getDefaultOrganizationId();
    return this.branchesService.create(organizationId, dto, user.userId);
  }
}
