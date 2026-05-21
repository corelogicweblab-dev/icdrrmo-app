"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import {
  fetchWindyTileLayers,
  ICDRRMO_WEATHER_ATTRIBUTION,
  pickWindyTileUrl,
} from "@/lib/windy-leaflet";

/**
 * ICDRRMO weather raster overlay via API tile proxy (Windy data, no embed logo).
 */
export function useWindyLeafletLayer(opts: {
  mapRef: RefObject<import("leaflet").Map | null>;
  mapReady: boolean;
  accessToken?: string | null;
  overlay?: string;
  opacity?: number;
}): { windyActive: boolean } {
  const layerRef = useRef<import("leaflet").TileLayer | null>(null);
  const [windyActive, setWindyActive] = useState(false);

  useEffect(() => {
    const map = opts.mapRef.current;
    if (!opts.mapReady || !map) {
      setWindyActive(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const { layers } = await fetchWindyTileLayers(opts.accessToken);
        const url = pickWindyTileUrl(layers, opts.overlay ?? "rain");
        if (cancelled || !url) {
          setWindyActive(false);
          return;
        }
        const L = await import("leaflet");
        if (cancelled) return;
        if (layerRef.current) {
          map.removeLayer(layerRef.current);
          layerRef.current = null;
        }
        const tile = L.tileLayer(url, {
          opacity: opts.opacity ?? 0.52,
          minZoom: 3,
          maxZoom: 18,
          zIndex: 400,
          attribution: ICDRRMO_WEATHER_ATTRIBUTION,
        });
        tile.addTo(map);
        tile.bringToFront();
        layerRef.current = tile;
        setWindyActive(true);
      } catch {
        if (!cancelled) setWindyActive(false);
      }
    })();

    return () => {
      cancelled = true;
      if (layerRef.current && map) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
      setWindyActive(false);
    };
  }, [opts.mapReady, opts.accessToken, opts.overlay, opts.opacity, opts.mapRef]);

  return { windyActive };
}
