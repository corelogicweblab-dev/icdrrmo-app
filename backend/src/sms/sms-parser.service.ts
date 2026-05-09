import { Injectable } from '@nestjs/common';
import { EmergencyType } from '@prisma/client';

/** Parsed SOS SMS: SOS|USER_ID|LATITUDE|LONGITUDE|TYPE|BATTERY */
export interface ParsedSosSms {
  userId: string;
  latitude: number;
  longitude: number;
  type: EmergencyType;
  battery: number | null;
}

const TYPE_MAP: Record<string, EmergencyType> = {
  FIRE: EmergencyType.FIRE,
  FLOOD: EmergencyType.FLOOD,
  ACCIDENT: EmergencyType.ACCIDENT,
  MEDICAL: EmergencyType.MEDICAL_EMERGENCY,
  MEDICAL_EMERGENCY: EmergencyType.MEDICAL_EMERGENCY,
  LANDSLIDE: EmergencyType.LANDSLIDE,
  CRIME: EmergencyType.CRIME,
  EARTHQUAKE: EmergencyType.EARTHQUAKE,
  TYPHOON: EmergencyType.TYPHOON,
  RESCUE: EmergencyType.RESCUE_REQUEST,
  RESCUE_REQUEST: EmergencyType.RESCUE_REQUEST,
};

@Injectable()
export class SmsParserService {
  parseSosBody(body: string): ParsedSosSms {
    const trimmed = body.trim();
    const parts = trimmed.split('|');
    if (parts.length !== 6 || parts[0] !== 'SOS') {
      throw new Error('INVALID_SMS_FORMAT');
    }
    const [, userId, latRaw, lonRaw, typeRaw, batteryRaw] = parts;
    if (!userId || userId.length < 8) {
      throw new Error('INVALID_USER_ID');
    }
    const latitude = Number(latRaw);
    const longitude = Number(lonRaw);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new Error('INVALID_COORDINATES');
    }
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      throw new Error('COORDINATES_OUT_OF_RANGE');
    }
    const typeKey = typeRaw.trim().toUpperCase();
    const type = TYPE_MAP[typeKey];
    if (!type) {
      throw new Error('UNKNOWN_EMERGENCY_TYPE');
    }
    const batteryParsed = Number(batteryRaw);
    const battery =
      Number.isFinite(batteryParsed) && batteryParsed >= 0 && batteryParsed <= 100
        ? Math.round(batteryParsed)
        : null;
    return { userId, latitude, longitude, type, battery };
  }
}
