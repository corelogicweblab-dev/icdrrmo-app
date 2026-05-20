import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const CHAIRMAN_INCIDENT_ACTIONS = [
  'acknowledge',
  'dispatch',
  'resolve',
] as const;

export type ChairmanIncidentAction = (typeof CHAIRMAN_INCIDENT_ACTIONS)[number];

export class ChairmanIncidentActionDto {
  @IsIn(CHAIRMAN_INCIDENT_ACTIONS)
  action!: ChairmanIncidentAction;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
