import { IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class InboundSmsDto {
  @IsString()
  @MinLength(8)
  @MaxLength(32)
  @Matches(/^\+?[0-9]{8,15}$/)
  from!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  body!: string;
}
