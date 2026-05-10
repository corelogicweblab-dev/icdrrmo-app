import { Injectable, Logger } from '@nestjs/common';
import { ISABELA_HAZARD_DISCLAIMER, ISABELA_HAZARD_ZONES } from './isabela-hazard-reference';

/** CDRRMO reference point — Isabela City proper (WGS84). */
const ISABELA_LAT = 6.7048;
const ISABELA_LON = 121.9715;

type OpenMeteoHourly = {
  time?: string[];
  precipitation_probability?: (number | null)[];
  precipitation?: (number | null)[];
  rain?: (number | null)[];
  weathercode?: (number | null)[];
};

type OpenMeteoCurrent = {
  temperature_2m?: number;
  relative_humidity_2m?: number;
  weather_code?: number;
  precipitation?: number;
  rain?: number;
  is_day?: number;
};

type OpenMeteoResponse = {
  current?: OpenMeteoCurrent;
  hourly?: OpenMeteoHourly;
};

function wmoLabel(code: number | undefined): string {
  if (code == null) return 'Unknown';
  if (code === 0) return 'Clear';
  if (code <= 3) return 'Mainly clear / partly cloudy';
  if (code <= 48) return 'Fog / depositing rime fog';
  if (code <= 57) return 'Drizzle';
  if (code <= 67) return 'Rain';
  if (code <= 77) return 'Snow / snow grains';
  if (code <= 82) return 'Rain showers';
  if (code <= 86) return 'Snow showers';
  if (code <= 99) return 'Thunderstorm';
  return 'Other';
}

function isRainyCode(code: number | undefined): boolean {
  if (code == null) return false;
  return (
    (code >= 51 && code <= 67) ||
    (code >= 80 && code <= 82) ||
    (code >= 95 && code <= 99) ||
    code === 45 ||
    code === 48
  );
}

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);

  async getSituationSnapshot(): Promise<{
    location: { label: string; latitude: number; longitude: number };
    fetchedAt: string;
    source: string;
    hazardDisclaimer: string;
    hazardZones: typeof ISABELA_HAZARD_ZONES;
    current: {
      temperatureC: number | null;
      humidityPct: number | null;
      weatherCode: number | null;
      weatherLabel: string;
      precipitationMm: number | null;
      rainMm: number | null;
      isDay: boolean | null;
    };
    nextHours: Array<{
      time: string;
      precipProbPct: number | null;
      precipMm: number | null;
      rainMm: number | null;
      weatherCode: number | null;
    }>;
    rainOutlook6h: {
      willRainLikely: boolean;
      headline: string;
      maxPrecipProbPct: number;
      totalRainMm: number;
      maxHourlyRainMm: number;
    };
    upstreamError?: string;
  }> {
    const hazardZones = ISABELA_HAZARD_ZONES;
    const base = {
      location: {
        label: 'Isabela City, Basilan (EOC reference grid)',
        latitude: ISABELA_LAT,
        longitude: ISABELA_LON,
      },
      fetchedAt: new Date().toISOString(),
      source: 'Open-Meteo (hourly forecast, no API key)',
      hazardDisclaimer: ISABELA_HAZARD_DISCLAIMER,
      hazardZones,
      current: {
        temperatureC: null,
        humidityPct: null,
        weatherCode: null,
        weatherLabel: 'Unavailable',
        precipitationMm: null,
        rainMm: null,
        isDay: null,
      },
      nextHours: [] as Array<{
        time: string;
        precipProbPct: number | null;
        precipMm: number | null;
        rainMm: number | null;
        weatherCode: number | null;
      }>,
      rainOutlook6h: {
        willRainLikely: false,
        headline: 'Forecast unavailable — check connection or try again.',
        maxPrecipProbPct: 0,
        totalRainMm: 0,
        maxHourlyRainMm: 0,
      },
    };

    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${ISABELA_LAT}&longitude=${ISABELA_LON}` +
      '&current=temperature_2m,relative_humidity_2m,weather_code,is_day,precipitation,rain' +
      '&hourly=precipitation_probability,precipitation,rain,weathercode' +
      '&timezone=Asia%2FManila&forecast_days=2';

    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'ICDRRMO-backend/1.0' } });
      if (!res.ok) {
        this.logger.warn(`Open-Meteo HTTP ${res.status}`);
        return { ...base, upstreamError: `Open-Meteo HTTP ${res.status}` };
      }
      const json = (await res.json()) as OpenMeteoResponse;
      const cur = json.current;
      const hourly = json.hourly;
      const times = hourly?.time ?? [];
      const probs = hourly?.precipitation_probability ?? [];
      const precips = hourly?.precipitation ?? [];
      const rains = hourly?.rain ?? [];
      const codes = hourly?.weathercode ?? [];

      const now = Date.now();
      let startIdx = 0;
      for (let i = 0; i < times.length; i++) {
        const t0 = times[i];
        if (!t0) continue;
        if (new Date(t0).getTime() >= now - 30 * 60 * 1000) {
          startIdx = i;
          break;
        }
      }
      const slice: typeof base.nextHours = [];
      for (let i = startIdx; i < Math.min(startIdx + 6, times.length); i++) {
        const t = times[i];
        if (!t) continue;
        slice.push({
          time: t,
          precipProbPct: probs[i] ?? null,
          precipMm: precips[i] ?? null,
          rainMm: rains[i] ?? null,
          weatherCode: codes[i] ?? null,
        });
      }

      const six = slice;
      let maxProb = 0;
      let totalRain = 0;
      let maxHourRain = 0;
      for (const h of six) {
        maxProb = Math.max(maxProb, h.precipProbPct ?? 0);
        totalRain += h.rainMm ?? h.precipMm ?? 0;
        maxHourRain = Math.max(maxHourRain, h.rainMm ?? h.precipMm ?? 0);
      }
      const curCode = cur?.weather_code;
      const curRainy = isRainyCode(curCode);
      const willRainLikely =
        curRainy || maxProb >= 45 || totalRain >= 1.5 || maxHourRain >= 0.8;

      let headline: string;
      if (curRainy) {
        headline = `Now: ${wmoLabel(curCode)} — rain or strong showers in the area.`;
      } else if (willRainLikely) {
        headline = `Next ~6h: rain likely (max ${Math.round(maxProb)}% hourly chance, ~${totalRain.toFixed(1)} mm model rain).`;
      } else {
        headline = `Next ~6h: rain unlikely (max ${Math.round(maxProb)}% chance; model total ~${totalRain.toFixed(1)} mm).`;
      }

      return {
        ...base,
        current: {
          temperatureC: cur?.temperature_2m ?? null,
          humidityPct: cur?.relative_humidity_2m ?? null,
          weatherCode: curCode ?? null,
          weatherLabel: wmoLabel(curCode),
          precipitationMm: cur?.precipitation ?? null,
          rainMm: cur?.rain ?? null,
          isDay: cur?.is_day === 1 ? true : cur?.is_day === 0 ? false : null,
        },
        nextHours: slice,
        rainOutlook6h: {
          willRainLikely,
          headline,
          maxPrecipProbPct: Math.round(maxProb),
          totalRainMm: Math.round(totalRain * 10) / 10,
          maxHourlyRainMm: Math.round(maxHourRain * 10) / 10,
        },
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Open-Meteo fetch failed: ${msg}`);
      return { ...base, upstreamError: msg };
    }
  }
}
