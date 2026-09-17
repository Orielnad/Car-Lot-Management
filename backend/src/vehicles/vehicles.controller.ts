import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleStatusDto } from './dto/update-vehicle-status.dto';
import { SetListPriceDto } from './dto/set-list-price.dto';
import { CreateExpenseDto } from './dto/create-expense.dto';

const CAN_MANAGE_INVENTORY: RoleName[] = [
  RoleName.OWNER,
  RoleName.INVENTORY_MANAGER,
];
const CAN_VIEW_COST: RoleName[] = [
  RoleName.OWNER,
  RoleName.INVENTORY_MANAGER,
  RoleName.FINANCE,
];

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get()
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    const vehicles = await this.vehiclesService.findAll();
    return vehicles.map((vehicle) => this.redactCostFields(vehicle, user));
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const vehicle = await this.vehiclesService.findOne(id);
    return this.redactCostFields(vehicle, user);
  }

  @Get(':id/events')
  getEvents(@Param('id') id: string) {
    return this.vehiclesService.getEvents(id);
  }

  @Post()
  @Roles(...CAN_MANAGE_INVENTORY)
  create(@Body() dto: CreateVehicleDto, @CurrentUser() user: AuthenticatedUser) {
    return this.vehiclesService.create(dto, user.userId);
  }

  @Patch(':id/status')
  @Roles(...CAN_MANAGE_INVENTORY)
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateVehicleStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.vehiclesService.updateStatus(id, dto, user.userId);
  }

  @Patch(':id/list-price')
  @Roles(...CAN_MANAGE_INVENTORY)
  setListPrice(
    @Param('id') id: string,
    @Body() dto: SetListPriceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.vehiclesService.setListPrice(id, dto, user.userId);
  }

  @Post(':id/expenses')
  @Roles(RoleName.OWNER, RoleName.INVENTORY_MANAGER, RoleName.FINANCE)
  addExpense(
    @Param('id') id: string,
    @Body() dto: CreateExpenseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.vehiclesService.addExpense(id, dto, user.userId);
  }

  /**
   * Cost/profit fields are role-restricted per docs/permissions.md ("$" —
   * Operations/Salesperson/Viewer don't see purchase price). Enforced here,
   * server-side, not by hiding a button in the UI.
   */
  private redactCostFields<T extends { purchasePrice: unknown }>(
    vehicle: T,
    user: AuthenticatedUser,
  ): T {
    const canViewCost = user.roles.some((role) => CAN_VIEW_COST.includes(role));
    if (canViewCost) {
      return vehicle;
    }
    return { ...vehicle, purchasePrice: undefined };
  }
}
