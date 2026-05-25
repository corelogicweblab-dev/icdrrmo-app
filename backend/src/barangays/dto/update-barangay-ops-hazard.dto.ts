import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateBarangayOpsHazardDto {
  @IsOptional()
  @IsBoolean()
  opsFloodActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  opsFloodMessage?: string;

  @IsOptional()
  @IsBoolean()
  opsRedZoneActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  opsRedZoneMessage?: string;

  /** Optional one-off alert pushed to all citizens in this barangay on save. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  citizenAlertTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3500)
  citizenAlertBody?: string;
}
