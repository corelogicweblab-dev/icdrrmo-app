import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type BarangayRiskInput = {
  barangayId: string;
  name: string;
  isFloodProne: boolean;
  opsFloodActive: boolean;
  opsRedZoneActive: boolean;
};

export type RiskScoreResult = {
  barangayId: string;
  name: string;
  score: number;
  level: string;
  engine: string;
  factors?: string[];
};

@Injectable()
export class RiskInferenceClient {
  private readonly logger = new Logger(RiskInferenceClient.name);
  private readonly baseUrl: string | undefined;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get<string>('RISK_INFERENCE_URL')?.replace(/\/$/, '');
  }

  async predict(
    barangays: BarangayRiskInput[],
    ctx: { rainLikely: boolean; maxPrecipProbPct: number; openIncidentsCity: number },
  ): Promise<RiskScoreResult[] | null> {
    if (!this.baseUrl) return null;
    try {
      const res = await fetch(`${this.baseUrl}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rain_likely: ctx.rainLikely,
          max_precip_prob_pct: ctx.maxPrecipProbPct,
          open_incidents_city: ctx.openIncidentsCity,
          barangays: barangays.map((b) => ({
            barangay_id: b.barangayId,
            name: b.name,
            is_flood_prone: b.isFloodProne,
            ops_flood_active: b.opsFloodActive,
            ops_red_zone_active: b.opsRedZoneActive,
          })),
        }),
        signal: AbortSignal.timeout(8_000),
      });
      if (!res.ok) {
        this.logger.warn(`Risk inference HTTP ${res.status}`);
        return null;
      }
      const rows = (await res.json()) as Array<{
        barangay_id: string;
        name: string;
        score: number;
        level: string;
        engine: string;
      }>;
      return rows.map((r) => ({
        barangayId: r.barangay_id,
        name: r.name,
        score: r.score,
        level: r.level,
        engine: r.engine,
      }));
    } catch (e: unknown) {
      this.logger.warn(`Risk inference unavailable: ${e instanceof Error ? e.message : e}`);
      return null;
    }
  }
}
