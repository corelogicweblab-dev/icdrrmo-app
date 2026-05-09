import { IsString, MinLength, MaxLength } from 'class-validator';

export class RefreshDto {
  @IsString()
  @MinLength(32)
  @MaxLength(2048)
  refreshToken!: string;
}
