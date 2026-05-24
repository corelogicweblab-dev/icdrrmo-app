import { getWindyApiKey } from "@/lib/env";

/** ICDRRMO desk layer id → Windy Map Forecast overlay. */
const WINDY_LAYER_CATALOG: Array<{ id: string; windy: string; label: string }> = [
  { id: "rain-radar", windy: "rain", label: "Rain radar (live)" },
  { id: "precipitation", windy: "rain", label: "Rain / precipitation" },
  { id: "clouds", windy: "clouds", label: "Clouds" },
  { id: "temp", windy: "temp", label: "Temperature" },
  { id: "wind", windy: "wind", label: "Wind" },
  { id: "satellite", windy: "satellite", label: "Satellite" },
];

export type WindyTileLayer = { id: string; label: string; urlTemplate: string };

export type WindyStore = {
  get: (key: string) => unknown;
  set: (key: string, value: unknown, opts?: { forceChange?: boolean }) => void;
  on: (key: string, cb: (value: unknown) => void) => void;
  off: (key: string, cb: (value: unknown) => void) => void;
};

export type WindyApi = {
  map: import("leaflet").Map;
  store: WindyStore;
};

type WindyInitOptions = {
  key: string;
  lat: number;
  lon: number;
  zoom: number;
  overlay?: string;
  verbose?: boolean;
};

declare global {
  interface Window {
    windyInit?: (options: WindyInitOptions, callback: (api: WindyApi) => void) => void;
    L?: typeof import("leaflet");
  }
}

const LEAFLET_140 = "https://unpkg.com/leaflet@1.4.0/dist/leaflet.js";
const WINDY_BOOT = "https://api.windy.com/assets/map-forecast/libBoot.js";

let scriptsPromise: Promise<void> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const el = document.createElement("script");
    el.src = src;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(el);
  });
}

export function hasWindyMapForecastKey(): boolean {
  return getWindyApiKey().length > 0;
}

/** Browser-side v9.0 raster URLs (fallback when Map Forecast unavailable). */
export function buildClientWindyTileLayers(): WindyTileLayer[] {
  const key = getWindyApiKey();
  if (!key) return [];
  const enc = encodeURIComponent(key);
  return WINDY_LAYER_CATALOG.map((l) => ({
    id: l.id,
    label: l.label,
    urlTemplate: `https://tiles.windy.com/tiles/v9.0/${l.windy}/{z}/{x}/{y}.png?key=${enc}`,
  }));
}

export function deskLayerToWindyOverlay(layerId: string): string {
  const hit = WINDY_LAYER_CATALOG.find((l) => l.id === layerId);
  return hit?.windy ?? "rain";
}

export function pickWindyOverlayFromActive(active: Iterable<string>): string {
  const order = ["wind", "rain-radar", "precipitation", "clouds", "temp"];
  for (const id of order) {
    for (const a of active) {
      if (a === id) return deskLayerToWindyOverlay(id);
    }
  }
  return "wind";
}

/** Hide Windy logo, menus, and promo links — ICDRRMO branding only. */
export function hideWindyChrome(container: HTMLElement): () => void {
  const selectors = [
    "#logo-wrapper",
    "#logo",
    "#bottom",
    "#mobile-ovr-select",
    "#embed-zoom",
    ".plugin-rhpane",
    ".menu-rhpane",
    ".windy-picker",
    "#progress-bar",
    "#timeline",
    ".timeline",
    ".timeline-wrapper",
    ".timecode",
    "#playpause",
    ".playpause",
    ".ui-animation",
    '[class*="timeline"]',
    'a[href*="windy.com"]',
    '[class*="logo"]',
  ].join(",");

  const scrub = (): void => {
    container.querySelectorAll(selectors).forEach((el) => {
      const node = el as HTMLElement;
      node.style.setProperty("display", "none", "important");
      node.style.setProperty("visibility", "hidden", "important");
      node.style.setProperty("opacity", "0", "important");
      node.style.setProperty("pointer-events", "none", "important");
    });
    container.querySelectorAll("*").forEach((el) => {
      const text = (el as HTMLElement).innerText?.trim() ?? "";
      if (
        text.includes("Not authorized to Windy API") ||
        text.includes("Check out the Map Forecast API") ||
        text.includes("visit the awesome weather forecast at Windy")
      ) {
        (el as HTMLElement).style.setProperty("display", "none", "important");
      }
    });
  };

  scrub();
  const mo = new MutationObserver(scrub);
  mo.observe(container, { childList: true, subtree: true, attributes: true });
  return () => mo.disconnect();
}

export function windyContainerHasAuthError(container: HTMLElement): boolean {
  const text = container.innerText ?? "";
  return (
    text.includes("Not authorized to Windy API") ||
    text.includes("unauthorized domain") ||
    text.includes("Cannot use Windy API")
  );
}

async function loadWindyScripts(): Promise<void> {
  if (!scriptsPromise) {
    scriptsPromise = (async () => {
      await loadScript(LEAFLET_140);
      await loadScript(WINDY_BOOT);
      if (typeof window.windyInit !== "function") {
        throw new Error("Windy Map Forecast library failed to initialize");
      }
    })();
  }
  await scriptsPromise;
}

export async function initWindyMapForecast(
  container: HTMLElement,
  opts: {
    lat: number;
    lon: number;
    zoom: number;
    overlay?: string;
  },
): Promise<{ api: WindyApi; stopChrome: () => void }> {
  const key = getWindyApiKey();
  if (!key) {
    throw new Error("Windy API key is not configured");
  }
  await loadWindyScripts();
  container.innerHTML = "";
  container.id = "windy";
  container.classList.add("icdrrmo-windy-root");

  const api = await new Promise<WindyApi>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(new Error("Windy map initialization timed out"));
    }, 45_000);

    try {
      window.windyInit!(
        {
          key,
          lat: opts.lat,
          lon: opts.lon,
          zoom: opts.zoom,
          overlay: opts.overlay ?? "rain",
          verbose: false,
        },
        (windyApi) => {
          window.clearTimeout(timeout);
          resolve(windyApi);
        },
      );
    } catch (e) {
      window.clearTimeout(timeout);
      reject(e instanceof Error ? e : new Error("Windy init failed"));
    }
  });

  const stopChrome = hideWindyChrome(container);

  await new Promise((r) => window.setTimeout(r, 1200));
  if (windyContainerHasAuthError(container)) {
    stopChrome();
    throw new Error("Windy API domain not authorized");
  }

  return { api, stopChrome };
}

export function applyWindyOverlay(api: WindyApi | null, overlay: string): void {
  if (!api) return;
  try {
    api.store.set("overlay", overlay, { forceChange: true });
  } catch {
    /* ignore */
  }
}

/** Force Windy embed timeline to play continuously (UI hidden via CSS). */
export function enableWindyLiveAnimation(api: WindyApi): () => void {
  const play = (): void => {
    try {
      api.store.set("animation", true, { forceChange: true });
      api.store.set("playAnimation", true, { forceChange: true });
      const ts = api.store.get("timestamp");
      if (typeof ts !== "number") {
        api.store.set("timestamp", Math.floor(Date.now() / 1000), { forceChange: true });
      }
    } catch {
      /* ignore */
    }
  };

  play();
  const timer = window.setInterval(play, 6000);
  return () => window.clearInterval(timer);
}

export function teardownWindyContainer(container: HTMLElement | null): void {
  if (!container) return;
  container.innerHTML = "";
  container.classList.remove("icdrrmo-windy-root");
  container.removeAttribute("id");
}
