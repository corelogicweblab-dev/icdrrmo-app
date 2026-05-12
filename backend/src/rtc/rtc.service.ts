import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const DEFAULT_STUN: { urls: string }[] = [{ urls: 'stun:stun.l.google.com:19302' }];

export type IceServerDto = {
  urls: string | string[];
  username?: string;
  credential?: string;
};

const OPENRELAY_DEMO: IceServerDto = {
  urls: [
    'turn:openrelay.metered.ca:80',
    'turn:openrelay.metered.ca:443',
    'turn:openrelay.metered.ca:443?transport=tcp',
  ],
  username: 'openrelayproject',
  credential: 'openrelayproject',
};

@Injectable()
export class RtcService {
  constructor(private readonly config: ConfigService) {}

  /**
   * WebRTC ICE servers for browser clients.
   * Prefer your own relay: TURN_URLS (comma-separated), TURN_USERNAME, TURN_CREDENTIAL.
   * If those are unset, Metered’s public demo relay is included so strict NAT still works (opt out: RTC_STUN_ONLY=1).
   */
  getIceServers(): { iceServers: IceServerDto[]; turnConfigured: boolean } {
    const stunOnly =
      this.config.get<string>('RTC_STUN_ONLY')?.trim() === '1' ||
      this.config.get<string>('RTC_STUN_ONLY')?.toLowerCase() === 'true';

    const urlsRaw = this.config.get<string>('TURN_URLS')?.trim();
    const username = this.config.get<string>('TURN_USERNAME')?.trim();
    const credential = this.config.get<string>('TURN_CREDENTIAL')?.trim();
    if (urlsRaw && username && credential) {
      const urlList = urlsRaw
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      if (urlList.length > 0) {
        const turnEntry: IceServerDto =
          urlList.length === 1
            ? { urls: urlList[0]!, username, credential }
            : { urls: urlList, username, credential };
        return { iceServers: [...DEFAULT_STUN, turnEntry], turnConfigured: true };
      }
    }

    if (stunOnly) {
      return { iceServers: [...DEFAULT_STUN], turnConfigured: false };
    }

    return { iceServers: [...DEFAULT_STUN, OPENRELAY_DEMO], turnConfigured: true };
  }
}
