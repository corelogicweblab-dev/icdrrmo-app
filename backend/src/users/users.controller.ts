import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ListUsersQueryDto } from './dto/list-users.query.dto';

function clientMeta(req: Request): { ip?: string; ua?: string } {
  const forwarded = req.headers['x-forwarded-for'];
  const ip =
    typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : req.ip;
  const ua = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined;
  return { ip, ua };
}

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.OPERATOR)
  @Get()
  list(@Query() q: ListUsersQueryDto) {
    return this.users.list(q);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.OPERATOR)
  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.users.getById(id);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post()
  create(
    @CurrentUser() actor: JwtPayload,
    @Body() dto: CreateUserDto,
    @Req() req: Request,
  ) {
    return this.users.create(actor, dto, clientMeta(req));
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch(':id')
  update(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Req() req: Request,
  ) {
    return this.users.update(actor, id, dto, clientMeta(req));
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Delete(':id')
  remove(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.users.deactivate(actor, id, clientMeta(req));
  }
}
