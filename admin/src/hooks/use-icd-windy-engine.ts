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

export type IcdMapEngine = "pending" | "windy" | "leaflet";

type Options = {
  hostRef: RefObject<HTMLDivElement | null>;
  lat: number;
  lon: number;
  zoom: number;
  activeLayerIds: Iterable<string>;
  enabled?: boolean;
};

/** Windy Map Forecast first — native wind/rain animation; falls back to Leaflet. */
export function useIcdWindyEngine(opts: Options): {
  engine: IcdMapEngine;
  windyApi: WindyApi | null;
  windyMap: import("leaflet").Map | null;
} {
  const [engine, setEngine] = useState<IcdMapEngine>("pending");
  const apiRef = useRef<WindyApi | null>(null);
  const stopChromeRef = useRef<(() => void) | null>(null);
  const stopAnimRef = useRef<(() => void) | null>(null);
  const enabled = opts.enabled !== false;

  useEffect(() => {
    const host = opts.hostRef.current;
    if (!enabled || !host) {
      setEngine("leaflet");
      return;
    }
    if (!hasWindyMapForecastKey()) {
      setEngine("leaflet");
      return;
    }

    let cancelled = false;
    const overlay = pickWindyOverlayFromActive(opts.activeLayerIds);

    void initWindyMapForecast(host, {
      lat: opts.lat,
      lon: opts.lon,
      zoom: opts.zoom,
      overlay,
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
        setEngine("windy");
      })
      .catch(() => {
        if (!cancelled) {
          teardownWindyContainer(host);
          setEngine("leaflet");
        }
      });

    return () => {
      cancelled = true;
      stopAnimRef.current?.();
      stopAnimRef.current = null;
      stopChromeRef.current?.();
      stopChromeRef.current = null;
      apiRef.current = null;
      teardownWindyContainer(host);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once per mount
  }, [enabled, opts.hostRef, opts.lat, opts.lon, opts.zoom]);

  useEffect(() => {
    if (engine !== "windy" || !apiRef.current) return;
    applyWindyOverlay(apiRef.current, pickWindyOverlayFromActive(opts.activeLayerIds));
  }, [engine, opts.activeLayerIds]);

  return {
    engine,
    windyApi: engine === "windy" ? apiRef.current : null,
    windyMap: engine === "windy" ? (apiRef.current?.map ?? null) : null,
  };
}
