import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MaxLength,
} from 'class-validator';
import { EmergencyType } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateSosDto {
  @IsEnum(EmergencyType)
  type!: EmergencyType;

  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  latitude!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  longitude!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  batteryLevel?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  signalStrength?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
