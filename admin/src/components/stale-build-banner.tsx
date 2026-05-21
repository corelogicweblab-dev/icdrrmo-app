"use client";

import type { ReactElement } from "react";
import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { WEB_BUILD_ID } from "@/lib/web-build-id";

const STORAGE_KEY = "icdrrmo_seen_build";

export function StaleBuildBanner(): ReactElement | null {
  const [stale, setStale] = useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (seen && seen !== WEB_BUILD_ID) setStale(true);
      localStorage.setItem(STORAGE_KEY, WEB_BUILD_ID);
    } catch {
      /* ignore */
    }
  }, []);

  const hardRefresh = useCallback(() => {
    void (async () => {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      window.location.reload();
    })();
  }, []);

  if (!stale) return null;

  return (
    <div className="shrink-0 border-b border-orange-500/40 bg-orange-950/50 px-4 py-2 text-center">
      <p className="text-[11px] text-orange-100">
        Older app version detected. Tap to load the latest SMART build ({WEB_BUILD_ID.slice(0, 12)}…).
      </p>
      <button
        type="button"
        onClick={() => hardRefresh()}
        className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg border border-orange-400/50 bg-orange-600/30 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-orange-50 hover:bg-orange-600/50"
      >
        <RefreshCw className="h-3 w-3" aria-hidden />
        Load latest version
      </button>
    </div>
  );
}
