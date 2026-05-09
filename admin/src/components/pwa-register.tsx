"use client";

import { useEffect } from "react";

/**
 * PWA service worker — production only.
 * In `next dev`, we **unregister** any existing workers so the browser cannot keep serving
 * stale dashboard chunks (common cause of “walang nagbabago” / old MVP copy).
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
    void navigator.serviceWorker.register("/sw.js").catch(() => {
      /* ignore registration failures */
    });
  }, []);
  return null;
}
