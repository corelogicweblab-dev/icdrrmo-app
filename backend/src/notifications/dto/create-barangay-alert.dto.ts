import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateBarangayAlertDto {
  @IsString()
  barangayId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(3500)
  body!: string;
}
