import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class AlertSmsDto {
  @IsString()
  @MinLength(8)
  @MaxLength(20)
  @Matches(/^\+?[0-9]{8,18}$/)
  toPhone!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(480)
  message!: string;
}
