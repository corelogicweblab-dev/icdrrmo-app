/** Mirrors `EmergencyType` in `backend/prisma/schema.prisma` — keep in sync. */
export const EMERGENCY_TYPES = [
  "FIRE",
  "FLOOD",
  "ACCIDENT",
  "MEDICAL_EMERGENCY",
  "LANDSLIDE",
  "CRIME",
  "EARTHQUAKE",
  "TYPHOON",
  "RESCUE_REQUEST",
  "OTHER",
] as const;

export type EmergencyTypeId = (typeof EMERGENCY_TYPES)[number];

export const INCIDENT_STATUSES = [
  "OPEN",
  "ACKNOWLEDGED",
  "DISPATCHED",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
  "FALSE_ALARM",
] as const;

export const RESPONDER_STATUSES = [
  "AVAILABLE",
  "DISPATCHED",
  "EN_ROUTE",
  "ON_SCENE",
  "TRANSPORTING",
  "COMPLETED",
  "OFF_DUTY",
  "UNAVAILABLE",
] as const;

export const VEHICLE_FLEET_STATUSES = ["AVAILABLE", "DEPLOYED", "UNDER_MAINTENANCE"] as const;
