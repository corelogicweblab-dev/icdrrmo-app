import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  UserRole,
} from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { AiAssistantService } from './ai-assistant.service';
import { AiChatDto } from './dto/ai-chat.dto';
import { ConfigService } from '@nestjs/config';

const AI_ROLES = [
  UserRole.CITIZEN,
  UserRole.RESPONDER,
  UserRole.OPERATOR,
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN,
  UserRole.BARANGAY_CHAIRMAN,
  UserRole.AUDITOR,
] as const;

@Controller('ai')
export class AiAssistantController {
  constructor(
    private readonly ai: AiAssistantService,
    private readonly config: ConfigService,
  ) {}

  @Get('health')
  health(): { service: string; geminiConfigured: boolean } {
    const key =
      this.config.get<string>('GEMINI_API_KEY')?.trim() ||
      this.config.get<string>('GOOGLE_AI_API_KEY')?.trim();
    return {
      service: 'icdrrmo-ai',
      geminiConfigured: Boolean(key),
    };
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...AI_ROLES)
  @Post('chat')
  chat(@CurrentUser() user: JwtPayload, @Body() dto: AiChatDto) {
    return this.ai.chat(user, dto);
  }
}
