import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
import { EmergencyType, IncidentStatus } from '@prisma/client';

export class CreateOpsIncidentDto {
  @IsEnum(EmergencyType)
  type!: EmergencyType;

  @Type(() => Number)
  @IsNumber()
  latitude!: number;

  @Type(() => Number)
  @IsNumber()
  longitude!: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @IsString()
  barangayId?: string;

  @IsOptional()
  @IsEnum(IncidentStatus)
  status?: IncidentStatus;
}
