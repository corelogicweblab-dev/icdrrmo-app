import { IsString, MinLength, MaxLength, Matches } from 'class-validator';

/** Intentionally not `@IsEmail()` — strict validators reject dev/LGU domains like `*.icdrrmo.local`. */
export class LoginDto {
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  @Matches(/^\S+@\S+$/, { message: 'Invalid email address' })
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
