import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class AlertEmailDto {
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  @Matches(/^\S+@\S+$/, { message: 'Invalid recipient address' })
  to!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  subject!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  text!: string;
}
