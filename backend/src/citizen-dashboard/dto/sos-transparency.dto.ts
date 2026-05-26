import { IsObject } from 'class-validator';

export class SosTransparencyDto {
  /** Checkbox id → acknowledged */
  @IsObject()
  checks!: Record<string, boolean>;
}
