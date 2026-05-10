import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { BloodType, Gender, ProfileAvailabilityStatus, UserRole } from '@prisma/client';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  fullName?: string;

  @IsOptional()
  @IsString()
  phone?: string | null;

  @IsOptional()
  @IsString()
  barangayId?: string | null;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string | null;

  @IsOptional()
  @IsEnum(BloodType)
  bloodType?: BloodType;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  allergies?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  medicalConditions?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  emergencyNotes?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500_000)
  profilePhotoUrl?: string | null;

  @IsOptional()
  @IsEnum(ProfileAvailabilityStatus)
  availabilityStatus?: ProfileAvailabilityStatus;
}
