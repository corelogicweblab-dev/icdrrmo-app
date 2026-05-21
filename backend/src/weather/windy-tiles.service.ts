import { Injectable } from '@nestjs/common';
import type { OpenWeatherLayerConfig } from './weather.service';

/** Windy raster layers — keys match https://tiles.windy.com/{layer}/… */
const WINDY_RASTER_LAYERS: Array<{ id: string; windy: string; label: string }> = [
  { id: 'rain-radar', windy: 'rain', label: 'Rain radar (Windy)' },
  { id: 'precipitation', windy: 'rain', label: 'Rain / precip (Windy)' },
  { id: 'clouds', windy: 'clouds', label: 'Clouds (Windy)' },
  { id: 'temp', windy: 'temp', label: 'Temperature (Windy)' },
  { id: 'wind', windy: 'wind', label: 'Wind (Windy)' },
  { id: 'satellite', windy: 'satellite', label: 'Satellite (Windy)' },
];

@Injectable()
export class WindyTilesService {
  getLayers(): { configured: boolean; layers: OpenWeatherLayerConfig[] } {
    const key = process.env.WINDY_API_KEY?.trim();
    if (!key) {
      return { configured: false, layers: [] };
    }
    const enc = encodeURIComponent(key);
    const layers = WINDY_RASTER_LAYERS.map((l) => ({
      id: l.id,
      label: l.label,
      urlTemplate: `https://tiles.windy.com/${l.windy}/{z}/{x}/{y}.png?key=${enc}`,
    }));
    return { configured: true, layers };
  }
}
