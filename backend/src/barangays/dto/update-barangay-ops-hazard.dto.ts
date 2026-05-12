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
}
