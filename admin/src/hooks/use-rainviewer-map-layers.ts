"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { TileLayer } from "leaflet";
import {
  createCloudAnimator,
  createRadarAnimator,
  type RainViewerTileAnimator,
} from "@/lib/leaflet-rainviewer-animation";
import type { RainViewerFrame } from "@/lib/rainviewer-radar";
import { fetchRainViewerManifest } from "@/lib/rainviewer-radar";

type Options = {
  mapRef: RefObject<import("leaflet").Map | null>;
  mapReady: boolean;
  radarFrames: RainViewerFrame[];
  satelliteFrames: RainViewerFrame[];
  showRain: boolean;
  showClouds: boolean;
  labelsRef: RefObject<TileLayer | null>;
};

/** Mounts RainViewer animated tile layers directly on the Leaflet map (no React per-frame churn). */
export function useRainViewerAnimatedLayers(opts: Options): void {
  const radarRef = useRef<RainViewerTileAnimator | null>(null);
  const cloudRef = useRef<RainViewerTileAnimator | null>(null);

  useEffect(() => {
    const map = opts.mapRef.current;
    if (!map || !opts.mapReady) return;

    let cancelled = false;

    void import("leaflet").then((L) => {
      if (cancelled) return;

      if (opts.showRain && opts.radarFrames.length > 0) {
        if (!radarRef.current) {
          radarRef.current = createRadarAnimator(L, map);
        }
        radarRef.current.setFrames(opts.radarFrames);
        radarRef.current.start();
        opts.labelsRef.current?.bringToFront();
      } else if (opts.showRain) {
        void fetchRainViewerManifest().then((manifest) => {
          if (cancelled || !manifest?.radarFrames.length || !opts.mapRef.current) return;
          if (!radarRef.current) {
            radarRef.current = createRadarAnimator(L, opts.mapRef.current);
          }
          radarRef.current.setFrames(manifest.radarFrames);
          radarRef.current.start();
          opts.labelsRef.current?.bringToFront();
        });
      } else {
        radarRef.current?.destroy();
        radarRef.current = null;
      }

      const cloudFrames =
        opts.satelliteFrames.length > 0 ? opts.satelliteFrames : opts.radarFrames;

      if (opts.showClouds && cloudFrames.length > 0) {
        if (!cloudRef.current) {
          cloudRef.current = createCloudAnimator(L, map);
        }
        cloudRef.current.setFrames(cloudFrames);
        cloudRef.current.start();
      } else {
        cloudRef.current?.destroy();
        cloudRef.current = null;
      }

      opts.labelsRef.current?.bringToFront();
    });

    return () => {
      cancelled = true;
    };
  }, [
    opts.mapReady,
    opts.showRain,
    opts.showClouds,
    opts.radarFrames,
    opts.satelliteFrames,
    opts.mapRef,
    opts.labelsRef,
  ]);

  useEffect(() => {
    return () => {
      radarRef.current?.destroy();
      cloudRef.current?.destroy();
      radarRef.current = null;
      cloudRef.current = null;
    };
  }, []);
}
