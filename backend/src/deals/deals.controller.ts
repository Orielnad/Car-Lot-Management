import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';
import { CAN_RECORD_PAYMENTS, DealsService } from './deals.service';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealStatusDto } from './dto/update-deal-status.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('deals')
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.dealsService.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.dealsService.findOne(id, user);
  }

  @Post()
  create(@Body() dto: CreateDealDto, @CurrentUser() user: AuthenticatedUser) {
    return this.dealsService.create(dto, user);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateDealStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.dealsService.updateStatus(id, dto, user);
  }

  @Get(':id/payments')
  @Roles(...CAN_RECORD_PAYMENTS)
  listPayments(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.dealsService.listPayments(id, user);
  }

  @Post(':id/payments')
  @Roles(...CAN_RECORD_PAYMENTS)
  addPayment(
    @Param('id') id: string,
    @Body() dto: CreatePaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.dealsService.addPayment(id, dto, user);
  }
}
