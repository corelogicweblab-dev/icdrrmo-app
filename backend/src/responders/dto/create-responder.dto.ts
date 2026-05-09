import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ResponderStatus } from '@prisma/client';

export class CreateResponderDto {
  @IsString()
  userId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  badgeNumber?: string;

  @IsOptional()
  @IsEnum(ResponderStatus)
  status?: ResponderStatus;

  @IsOptional()
  @IsString()
  vehicleId?: string | null;
}
