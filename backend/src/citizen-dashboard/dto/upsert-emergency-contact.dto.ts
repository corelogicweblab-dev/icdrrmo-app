import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpsertEmergencyContactDto {
  @IsString()
  fullName!: string;

  @IsString()
  phone!: string;

  @IsOptional()
  @IsString()
  relationship?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  priority?: number;
}
