import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { EvacuationCentersService } from './evacuation-centers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { CreateEvacuationCenterDto } from './dto/create-evacuation-center.dto';
import { UpdateEvacuationCenterDto } from './dto/update-evacuation-center.dto';

function clientMeta(req: Request): { ip?: string; ua?: string } {
  const forwarded = req.headers['x-forwarded-for'];
  const ip =
    typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : req.ip;
  const ua = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined;
  return { ip, ua };
}

@Controller('evacuation-centers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EvacuationCentersController {
  constructor(private readonly centers: EvacuationCentersService) {}

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.OPERATOR)
  @Get()
  list() {
    return this.centers.list();
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post()
  create(
    @CurrentUser() actor: JwtPayload,
    @Body() dto: CreateEvacuationCenterDto,
    @Req() req: Request,
  ) {
    return this.centers.create(actor, dto, clientMeta(req));
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch(':id')
  update(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateEvacuationCenterDto,
    @Req() req: Request,
  ) {
    return this.centers.update(actor, id, dto, clientMeta(req));
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Delete(':id')
  remove(@CurrentUser() actor: JwtPayload, @Param('id') id: string, @Req() req: Request) {
    return this.centers.remove(actor, id, clientMeta(req));
  }
}
