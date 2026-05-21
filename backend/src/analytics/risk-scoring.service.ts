import { Injectable } from '@nestjs/common';
import { WeatherSituationSnapshot } from '../weather/weather.service';
import { RiskInferenceClient, type RiskScoreResult } from './risk-inference.client';

type BarangayRow = {
  id: string;
  code: string;
  name: string;
  isFloodProne: boolean;
  opsFloodActive: boolean;
  opsRedZoneActive: boolean;
};

@Injectable()
export class RiskScoringService {
  constructor(private readonly inference: RiskInferenceClient) {}

  async scoreBarangays(
    barangays: BarangayRow[],
    weather: WeatherSituationSnapshot | null,
    openIncidents: number,
  ): Promise<RiskScoreResult[]> {
    const rainLikely = weather?.rainOutlook6h.willRainLikely ?? false;
    const maxProb = weather?.rainOutlook6h.maxPrecipProbPct ?? 0;

    const ml = await this.inference.predict(
      barangays.map((b) => ({
        barangayId: b.id,
        name: b.name,
        isFloodProne: b.isFloodProne,
        opsFloodActive: b.opsFloodActive,
        opsRedZoneActive: b.opsRedZoneActive,
      })),
      { rainLikely, maxPrecipProbPct: maxProb, openIncidentsCity: openIncidents },
    );

    if (ml?.length) {
      return ml.map((r) => {
        const b = barangays.find((x) => x.id === r.barangayId);
        return {
          ...r,
          factors: b ? this.factorsFor(b, rainLikely) : [],
        };
      });
    }

    return barangays.map((b) => {
      let score = 0;
      if (b.isFloodProne) score += 25;
      if (b.opsFloodActive) score += 35;
      if (b.opsRedZoneActive) score += 40;
      if (rainLikely) score += 20;
      if (maxProb > 60) score += 15;
      score = Math.min(100, score);
      const level =
        score >= 75 ? 'critical' : score >= 50 ? 'high' : score >= 30 ? 'moderate' : 'routine';
      return {
        barangayId: b.id,
        name: b.name,
        score,
        level,
        engine: 'rules-fallback',
        factors: this.factorsFor(b, rainLikely),
      };
    });
  }

  private factorsFor(b: BarangayRow, rainLikely: boolean): string[] {
    return [
      b.isFloodProne ? 'flood-prone' : null,
      b.opsFloodActive ? 'active-flood-ops' : null,
      b.opsRedZoneActive ? 'red-zone' : null,
      rainLikely ? 'rain-forecast' : null,
    ].filter((x): x is string => Boolean(x));
  }
}
