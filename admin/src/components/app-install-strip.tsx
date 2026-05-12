"use client";

import type { ReactElement } from "react";
import { useCallback, useEffect, useState } from "react";
import { Download } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Always-visible PWA hint for citizen / responder / ops (root layout).
 * The native install button only appears when the browser fires `beforeinstallprompt` (e.g. Chrome Android).
 */
export function AppInstallStrip(): ReactElement {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const onBip = (e: Event): void => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBip as EventListener);
    return () => window.removeEventListener("beforeinstallprompt", onBip as EventListener);
  }, []);

  const onInstall = useCallback(async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  }, [installEvent]);

  return (
    <div className="sticky top-0 z-[60] border-b border-emerald-500/30 bg-emerald-950/50 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <p className="text-[11px] leading-snug text-emerald-100/95">
          <span className="font-semibold text-emerald-50">Install app</span>
          {" — "}
          <span className="text-emerald-100/90">
            Android (Chrome/Edge): use <strong className="text-white">Install</strong> when shown. iPhone/iPad
            (Safari):{" "}
            <span className="whitespace-nowrap font-medium text-white">Share → Add to Home Screen</span>.
          </span>
        </p>
        {installEvent ? (
          <button
            type="button"
            onClick={() => void onInstall()}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 self-start rounded-lg border border-emerald-400/40 bg-emerald-600/30 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-50 hover:bg-emerald-600/45 sm:self-center"
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            Install
          </button>
        ) : null}
      </div>
    </div>
  );
}
