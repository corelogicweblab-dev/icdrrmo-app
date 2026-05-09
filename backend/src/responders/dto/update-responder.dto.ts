import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ResponderStatus } from '@prisma/client';

export class UpdateResponderDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  badgeNumber?: string | null;

  @IsOptional()
  @IsEnum(ResponderStatus)
  status?: ResponderStatus;

  @IsOptional()
  @IsString()
  vehicleId?: string | null;
}
