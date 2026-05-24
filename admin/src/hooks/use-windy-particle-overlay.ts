"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import {
  applyWindyOverlay,
  enableWindyLiveAnimation,
  hasWindyMapForecastKey,
  initWindyMapForecast,
  pickWindyOverlayFromActive,
  teardownWindyContainer,
  type WindyApi,
} from "@/lib/windy-map-forecast";

type Options = {
  hostRef: RefObject<HTMLDivElement | null>;
  mapRef: RefObject<import("leaflet").Map | null>;
  mapReady: boolean;
  activeLayerIds: Iterable<string>;
  lat: number;
  lon: number;
  zoom: number;
};

/**
 * Windy Map Forecast particle overlay — Leaflet basemap stays visible underneath.
 * Windy basemap hidden via CSS; only animated weather canvas shows.
 */
export function useWindyParticleOverlay(opts: Options): { windyActive: boolean } {
  const apiRef = useRef<WindyApi | null>(null);
  const stopChromeRef = useRef<(() => void) | null>(null);
  const stopAnimRef = useRef<(() => void) | null>(null);
  const syncCleanupRef = useRef<(() => void) | null>(null);
  const [windyActive, setWindyActive] = useState(false);

  useEffect(() => {
    const host = opts.hostRef.current;
    const map = opts.mapRef.current;
    if (!opts.mapReady || !host || !map) return;

    if (!hasWindyMapForecastKey()) {
      host.classList.add("hidden");
      return;
    }

    let cancelled = false;

    void initWindyMapForecast(host, {
      lat: opts.lat,
      lon: opts.lon,
      zoom: opts.zoom,
      overlay: pickWindyOverlayFromActive(opts.activeLayerIds),
    })
      .then(({ api, stopChrome }) => {
        if (cancelled) {
          stopChrome();
          teardownWindyContainer(host);
          return;
        }
        apiRef.current = api;
        stopChromeRef.current = stopChrome;
        stopAnimRef.current = enableWindyLiveAnimation(api);
        setWindyActive(true);
        host.classList.remove("hidden");

        const syncFromLeaflet = (): void => {
          const c = map.getCenter();
          const z = map.getZoom();
          try {
            api.map.setView([c.lat, c.lng], z, { animate: false });
          } catch {
            /* ignore */
          }
        };

        syncFromLeaflet();
        map.on("move", syncFromLeaflet);
        map.on("zoom", syncFromLeaflet);
        map.on("zoomend", syncFromLeaflet);
        map.on("resize", syncFromLeaflet);

        syncCleanupRef.current = () => {
          map.off("move", syncFromLeaflet);
          map.off("zoom", syncFromLeaflet);
          map.off("zoomend", syncFromLeaflet);
          map.off("resize", syncFromLeaflet);
        };
      })
      .catch(() => {
        if (!cancelled) {
          setWindyActive(false);
          host.classList.add("hidden");
          teardownWindyContainer(host);
        }
      });

    return () => {
      cancelled = true;
      setWindyActive(false);
      syncCleanupRef.current?.();
      syncCleanupRef.current = null;
      stopAnimRef.current?.();
      stopAnimRef.current = null;
      stopChromeRef.current?.();
      stopChromeRef.current = null;
      apiRef.current = null;
      teardownWindyContainer(host);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once per desk mount
  }, [opts.mapReady, opts.hostRef, opts.mapRef, opts.lat, opts.lon, opts.zoom]);

  useEffect(() => {
    if (!apiRef.current) return;
    applyWindyOverlay(apiRef.current, pickWindyOverlayFromActive(opts.activeLayerIds));
  }, [opts.activeLayerIds]);

  return { windyActive };
}
