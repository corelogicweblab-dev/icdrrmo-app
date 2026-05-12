import {
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { BloodType, Gender, ProfileAvailabilityStatus } from '@prisma/client';

export class PatchMyProfileDto {
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
  @MaxLength(64)
  barangayId?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^IC-\d{3}$/i, { message: 'barangayCode must look like IC-001' })
  barangayCode?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  streetPurok?: string | null;

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
