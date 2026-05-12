import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

/** Citizen registration — aligns with `UserProfile` + LGU intake. */
const REGISTER_GENDERS = ['MALE', 'FEMALE', 'OTHER'] as const;

const REGISTER_BLOOD_TYPES = [
  'A_POS',
  'A_NEG',
  'B_POS',
  'B_NEG',
  'O_POS',
  'O_NEG',
  'AB_POS',
  'AB_NEG',
] as const;

export class RegisterDto {
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  fullName!: string;

  /** ISO calendar date `YYYY-MM-DD` */
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'birthday must be YYYY-MM-DD' })
  birthday!: string;

  @IsIn(REGISTER_GENDERS)
  gender!: (typeof REGISTER_GENDERS)[number];

  @IsIn(REGISTER_BLOOD_TYPES)
  bloodType!: (typeof REGISTER_BLOOD_TYPES)[number];

  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  medicalConditions!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  streetPurok!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(32)
  @Matches(/^\+?[0-9]{8,15}$/, { message: 'phone must be E.164-like digits' })
  phone!: string;

  @IsString()
  @MinLength(20)
  @MaxLength(600_000)
  /** `data:image/jpeg;base64,...` or `https://...` */
  profilePhotoUrl!: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  )
  @IsString()
  @MaxLength(64)
  barangayId?: string;

  /** When the client only has seed codes from offline list (`IC-001` …). */
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  )
  @IsString()
  @Matches(/^IC-\d{3}$/i, { message: 'barangayCode must look like IC-001' })
  barangayCode?: string;
}
