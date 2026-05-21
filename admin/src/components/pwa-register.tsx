"use client";

import { useEffect } from "react";

/**
 * PWA service worker — production only.
 * In `next dev`, we **unregister** any existing workers so the browser cannot keep serving
 * stale dashboard chunks (a common reason the UI “never updates” during development).
 */
export function PwaRegister(): null {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    const isDev = process.env.NODE_ENV === "development";
    if (isDev) {
      void navigator.serviceWorker.getRegistrations().then((regs) => {
        void Promise.all(regs.map((r) => r.unregister()));
      });
      return;
    }
    void navigator.serviceWorker
      .register(`/sw.js?v=${encodeURIComponent(process.env.NEXT_PUBLIC_WEB_BUILD_ID ?? "1")}`)
      .catch(() => {
        /* ignore registration failures */
      });
  }, []);
  return null;
}
