import { Injectable, Logger } from '@nestjs/common';
import type { OpenWeatherLayerConfig } from './weather.service';

const RAINVIEWER_API = 'https://api.rainviewer.com/public/weather-maps.json';

/** Tile layers that work without OpenWeatherMap API key. */
@Injectable()
export class FreeWeatherTilesService {
  private readonly logger = new Logger(FreeWeatherTilesService.name);

  async getLayers(): Promise<OpenWeatherLayerConfig[]> {
    try {
      const res = await fetch(RAINVIEWER_API, {
        headers: { 'User-Agent': 'ICDRRMO-EOC/1.0 (+rainviewer)' },
        signal: AbortSignal.timeout(12_000),
      });
      if (!res.ok) return [];
      const data = (await res.json()) as {
        radar?: { past?: Array<{ path: string }> };
        satellite?: { infrared?: { past?: Array<{ path: string }> } };
      };
      const radarPath = data.radar?.past?.[data.radar.past.length - 1]?.path;
      const satPath = data.satellite?.infrared?.past?.[
        (data.satellite.infrared.past?.length ?? 1) - 1
      ]?.path;

      const layers: OpenWeatherLayerConfig[] = [];
      if (radarPath) {
        layers.push({
          id: 'precipitation',
          label: 'Rain / precipitation (RainViewer)',
          urlTemplate: `https://tilecache.rainviewer.com${radarPath}/256/{z}/{x}/{y}/2/1_1.png`,
        });
      }
      if (satPath) {
        layers.push({
          id: 'clouds',
          label: 'Clouds / IR satellite (RainViewer)',
          urlTemplate: `https://tilecache.rainviewer.com${satPath}/256/{z}/{x}/{y}/0/0_0.png`,
        });
      } else if (radarPath) {
        layers.push({
          id: 'clouds',
          label: 'Clouds (radar composite)',
          urlTemplate: `https://tilecache.rainviewer.com${radarPath}/256/{z}/{x}/{y}/2/1_0.png`,
        });
      }
      return layers;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`RainViewer tiles unavailable: ${msg}`);
      return [];
    }
  }
}
