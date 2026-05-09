import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { RespondersService } from './responders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { CreateResponderDto } from './dto/create-responder.dto';
import { UpdateResponderDto } from './dto/update-responder.dto';

function clientMeta(req: Request): { ip?: string; ua?: string } {
  const forwarded = req.headers['x-forwarded-for'];
  const ip =
    typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : req.ip;
  const ua = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined;
  return { ip, ua };
}

@Controller('responders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RespondersController {
  constructor(private readonly responders: RespondersService) {}

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.OPERATOR)
  @Get()
  list() {
    return this.responders.list();
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post()
  create(
    @CurrentUser() actor: JwtPayload,
    @Body() dto: CreateResponderDto,
    @Req() req: Request,
  ) {
    return this.responders.create(actor, dto, clientMeta(req));
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch(':id')
  update(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateResponderDto,
    @Req() req: Request,
  ) {
    return this.responders.update(actor, id, dto, clientMeta(req));
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Delete(':id')
  remove(@CurrentUser() actor: JwtPayload, @Param('id') id: string, @Req() req: Request) {
    return this.responders.remove(actor, id, clientMeta(req));
  }
}
