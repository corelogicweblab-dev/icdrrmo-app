import { IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export const AGENCY_CALL_TARGETS = ['BFP', 'PNP', 'CHAIRMAN'] as const;
export type AgencyCallTarget = (typeof AGENCY_CALL_TARGETS)[number];

export class TriggerAgencyCallDto {
  @IsIn(AGENCY_CALL_TARGETS)
  target!: AgencyCallTarget;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  )
  @IsString()
  @MaxLength(64)
  incidentId?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  )
  @IsString()
  @MaxLength(64)
  barangayId?: string;

  /** Seed / offline list codes (`IC-001` …) when client has no DB UUID yet. */
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  )
  @IsString()
  @Matches(/^IC-\d{3}$/i, { message: 'barangayCode must look like IC-001' })
  barangayCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}
