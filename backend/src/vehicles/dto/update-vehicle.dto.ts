import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { VehicleFleetStatus } from '@prisma/client';

export class UpdateVehicleDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(32)
  plateNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  type?: string | null;

  @IsOptional()
  @IsEnum(VehicleFleetStatus)
  fleetStatus?: VehicleFleetStatus;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
