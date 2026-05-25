import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const AGENCY_CALL_TARGETS = ['BFP', 'PNP', 'CHAIRMAN'] as const;
export type AgencyCallTarget = (typeof AGENCY_CALL_TARGETS)[number];

export class TriggerAgencyCallDto {
  @IsIn(AGENCY_CALL_TARGETS)
  target!: AgencyCallTarget;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  incidentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  barangayId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}
