import type { Map, TileLayer } from "leaflet";
import {
  rainCloudTileTemplate,
  rainRadarTileTemplate,
  satelliteTileTemplate,
  type RainViewerFrame,
} from "@/lib/rainviewer-radar";
import { RAINVIEWER_MAX_NATIVE_ZOOM } from "@/lib/eoc-public-feeds";

type FrameUrlBuilder = (path: string) => string;

type AnimatorOptions = {
  opacity?: number;
  className?: string;
  pane?: string;
  zIndex?: number;
  intervalMs?: number;
  buildUrl?: FrameUrlBuilder;
};

/** Imperative dual-buffer radar animation — avoids React/async tile races. */
export class RainViewerTileAnimator {
  private map: Map | null = null;
  private layerA: TileLayer | null = null;
  private layerB: TileLayer | null = null;
  private front: "a" | "b" = "a";
  private frames: RainViewerFrame[] = [];
  private frameIndex = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly L: typeof import("leaflet");
  private readonly opts: Required<AnimatorOptions>;

  constructor(L: typeof import("leaflet"), map: Map, options: AnimatorOptions = {}) {
    this.L = L;
    this.map = map;
    this.opts = {
      opacity: options.opacity ?? 0.92,
      className: options.className ?? "icd-weather-radar-tiles",
      pane: options.pane ?? "overlayPane",
      zIndex: options.zIndex ?? 415,
      intervalMs: options.intervalMs ?? 420,
      buildUrl: options.buildUrl ?? rainRadarTileTemplate,
    };
  }

  private tileOptions(url: string, opacity: number) {
    return {
      opacity,
      minZoom: 3,
      maxZoom: 18,
      maxNativeZoom: RAINVIEWER_MAX_NATIVE_ZOOM,
      pane: this.opts.pane,
      className: this.opts.className,
      zIndex: this.opts.zIndex,
      updateWhenIdle: false,
      updateWhenZooming: true,
      attribution: "",
    };
  }

  private ensureLayers(path: string): void {
    if (!this.map) return;
    const url = this.opts.buildUrl(path);
    if (!this.layerA) {
      this.layerA = this.L.tileLayer(url, this.tileOptions(url, this.opts.opacity)).addTo(this.map);
      this.layerB = this.L.tileLayer(url, this.tileOptions(url, 0)).addTo(this.map);
    }
  }

  private activeLayer(): TileLayer | null {
    return this.front === "a" ? this.layerA : this.layerB;
  }

  private backLayer(): TileLayer | null {
    return this.front === "a" ? this.layerB : this.layerA;
  }

  private swapToFrame(index: number): void {
    const frame = this.frames[index];
    if (!frame?.path || !this.map) return;
    this.ensureLayers(frame.path);
    const back = this.backLayer();
    const front = this.activeLayer();
    if (!back || !front) return;

    const url = this.opts.buildUrl(frame.path);
    back.setUrl(url);
    back.setOpacity(0);
    back.bringToFront();

    window.requestAnimationFrame(() => {
      back.setOpacity(this.opts.opacity);
      front.setOpacity(0);
      this.front = this.front === "a" ? "b" : "a";
    });

    this.frameIndex = index;
  }

  setFrames(frames: RainViewerFrame[]): void {
    this.frames = frames;
    if (!frames.length) {
      this.stop();
      this.remove();
      return;
    }
    this.frameIndex = Math.max(0, frames.length - 1);
    this.swapToFrame(this.frameIndex);
  }

  start(): void {
    this.stop();
    if (this.frames.length < 2) return;
    this.timer = setInterval(() => {
      const next = (this.frameIndex + 1) % this.frames.length;
      this.swapToFrame(next);
    }, this.opts.intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  remove(): void {
    if (this.layerA && this.map) {
      this.map.removeLayer(this.layerA);
    }
    if (this.layerB && this.map) {
      this.map.removeLayer(this.layerB);
    }
    this.layerA = null;
    this.layerB = null;
    this.front = "a";
  }

  destroy(): void {
    this.stop();
    this.remove();
    this.map = null;
    this.frames = [];
  }

  getFrameIndex(): number {
    return this.frameIndex;
  }

  getFrameCount(): number {
    return this.frames.length;
  }
}

export function createRadarAnimator(
  L: typeof import("leaflet"),
  map: Map,
): RainViewerTileAnimator {
  return new RainViewerTileAnimator(L, map, {
    buildUrl: rainRadarTileTemplate,
    className: "icd-weather-radar-tiles",
    opacity: 0.85,
    zIndex: 415,
  });
}

export function createCloudAnimator(
  L: typeof import("leaflet"),
  map: Map,
): RainViewerTileAnimator {
  return new RainViewerTileAnimator(L, map, {
    buildUrl: (path) => {
      if (path.includes("/satellite/") || path.startsWith("/v2/satellite")) {
        return satelliteTileTemplate(path);
      }
      return rainCloudTileTemplate(path);
    },
    className: "icd-weather-cloud-tiles",
    opacity: 0.65,
    zIndex: 412,
    intervalMs: 420,
  });
}
