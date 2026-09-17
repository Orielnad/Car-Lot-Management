import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';
import { CAN_VIEW_VEHICLE_MATCHES, MatchesService } from './matches.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Post('leads/:leadId/matches/recompute')
  recomputeForLead(
    @Param('leadId') leadId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.matchesService.recomputeForLead(leadId, user);
  }

  @Get('leads/:leadId/matches')
  findForLead(@Param('leadId') leadId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.matchesService.findForLead(leadId, user);
  }

  @Get('vehicles/:vehicleId/matches')
  @Roles(...CAN_VIEW_VEHICLE_MATCHES)
  findForVehicle(@Param('vehicleId') vehicleId: string) {
    return this.matchesService.findForVehicle(vehicleId);
  }
}
