import { Controller, Get, UseGuards } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';
import { ReportsService } from './reports.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('inventory')
  @Roles(
    RoleName.OWNER,
    RoleName.SALES_MANAGER,
    RoleName.INVENTORY_MANAGER,
    RoleName.FINANCE,
    RoleName.VIEWER,
  )
  getInventoryReport() {
    return this.reportsService.getInventoryReport();
  }

  @Get('sales')
  @Roles(RoleName.OWNER, RoleName.SALES_MANAGER, RoleName.FINANCE)
  getSalesReport() {
    return this.reportsService.getSalesReport();
  }

  @Get('leads')
  @Roles(RoleName.OWNER, RoleName.SALES_MANAGER)
  getLeadsReport() {
    return this.reportsService.getLeadsReport();
  }

  @Get('my-performance')
  getMyPerformance(@CurrentUser() user: AuthenticatedUser) {
    return this.reportsService.getMyPerformance(user);
  }
}
