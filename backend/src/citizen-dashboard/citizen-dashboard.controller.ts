import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { CitizenDashboardService } from './citizen-dashboard.service';
import { PatchPreparednessDto } from './dto/patch-preparedness.dto';
import { UpsertEmergencyContactDto } from './dto/upsert-emergency-contact.dto';

const CITIZEN_ROLES = [UserRole.CITIZEN, UserRole.BARANGAY_CHAIRMAN] as const;

@Controller('citizen')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...CITIZEN_ROLES)
export class CitizenDashboardController {
  constructor(private readonly dashboard: CitizenDashboardService) {}

  /** Unified SMART feed: GeoJSON hazards, Windy tiles, evac, community, enterprise metrics. */
  @Get('feed')
  feed(
    @CurrentUser() user: JwtPayload,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
  ) {
    const la = lat != null ? Number(lat) : undefined;
    const ln = lng != null ? Number(lng) : undefined;
    return this.dashboard.getUnifiedFeed(
      user,
      Number.isFinite(la) ? la : undefined,
      Number.isFinite(ln) ? ln : undefined,
    );
  }

  @Get('feed/geojson')
  async geojsonOnly(@CurrentUser() user: JwtPayload) {
    const feed = await this.dashboard.getUnifiedFeed(user);
    return {
      hazardGeo: feed.hazardGeo,
      heatmaps: feed.heatmaps,
      generatedAt: feed.generatedAt,
    };
  }

  @Get('incidents/mine')
  myIncidents(@CurrentUser() user: JwtPayload) {
    return this.dashboard.listMyIncidents(user);
  }

  @Get('incidents/:id/timeline')
  myTimeline(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.dashboard.getMyIncidentTimeline(user, id);
  }

  @Get('community')
  community(@CurrentUser() user: JwtPayload) {
    return this.dashboard.listCommunity(user);
  }

  @Get('preparedness')
  preparedness(@CurrentUser() user: JwtPayload) {
    return this.dashboard.getPreparedness(user);
  }

  @Patch('preparedness')
  patchPreparedness(@CurrentUser() user: JwtPayload, @Body() dto: PatchPreparednessDto) {
    return this.dashboard.patchPreparedness(user, dto);
  }

  @Get('medical')
  medical(@CurrentUser() user: JwtPayload) {
    return this.dashboard.getMedicalSnapshot(user.sub);
  }

  @Get('emergency-contacts')
  emergencyContacts(@CurrentUser() user: JwtPayload) {
    return this.dashboard.listEmergencyContacts(user);
  }

  @Post('emergency-contacts')
  createContact(@CurrentUser() user: JwtPayload, @Body() dto: UpsertEmergencyContactDto) {
    return this.dashboard.createEmergencyContact(user, dto);
  }

  @Delete('emergency-contacts/:id')
  deleteContact(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.dashboard.deleteEmergencyContact(user, id);
  }

  @Get('system-health')
  systemHealth() {
    return this.dashboard.systemHealth();
  }
}
