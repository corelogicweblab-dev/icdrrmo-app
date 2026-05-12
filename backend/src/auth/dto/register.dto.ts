import { IsEmail, IsString, MinLength, MaxLength, Matches, IsOptional } from 'class-validator';

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

  @IsString()
  @MinLength(8)
  @MaxLength(32)
  @Matches(/^\+?[0-9]{8,15}$/, { message: 'phone must be E.164-like digits' })
  phone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  barangayId?: string;

  /** Stable seed code when the client could not load barangay UUIDs from `GET /barangays/public`. */
  @IsOptional()
  @IsString()
  @Matches(/^IC-\d{3}$/i, { message: 'barangayCode must look like IC-001' })
  barangayCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  streetPurok?: string | null;
}
