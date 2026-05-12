import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const DEFAULT_STUN: { urls: string }[] = [{ urls: 'stun:stun.l.google.com:19302' }];

export type IceServerDto = {
  urls: string | string[];
  username?: string;
  credential?: string;
};

@Injectable()
export class RtcService {
  private readonly logger = new Logger(RtcService.name);
  private warnedMissingTurn = false;

  constructor(private readonly config: ConfigService) {}

  /**
   * ICE servers for browser WebRTC. STUN is always included.
   * TURN relay (required for most carrier-grade NAT) is included only when all of
   * TURN_URLS, TURN_USERNAME, TURN_CREDENTIAL are set on this API host (e.g. Coturn or a managed TURN product).
   */
  getIceServers(): { iceServers: IceServerDto[]; turnConfigured: boolean } {
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

    if (!this.warnedMissingTurn) {
      this.warnedMissingTurn = true;
      this.logger.warn(
        'TURN_URLS / TURN_USERNAME / TURN_CREDENTIAL are not fully set — voice will use STUN only and may fail on strict NAT. Configure a TURN service on this API.',
      );
    }

    return { iceServers: [...DEFAULT_STUN], turnConfigured: false };
  }
}
