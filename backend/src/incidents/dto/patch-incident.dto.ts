import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';
import { IncidentStatus, RoutedAgency } from '@prisma/client';

export class PatchIncidentDto {
  @IsOptional()
  @IsEnum(IncidentStatus)
  status?: IncidentStatus;

  /**
   * Responder row id (Prisma `responders.id`). Pass `null` to unassign (via JSON body literal null).
   */
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  assignedResponderId?: string | null;

  /** Queue outbound SMS via BullMQ `sms-retry` (requires worker + gateway integration). */
  @IsOptional()
  @IsBoolean()
  notifyReporterSms?: boolean;

  /** EOC override — reroute incident to another agency queue (audited). */
  @IsOptional()
  @IsEnum(RoutedAgency)
  routedAgency?: RoutedAgency;
}
