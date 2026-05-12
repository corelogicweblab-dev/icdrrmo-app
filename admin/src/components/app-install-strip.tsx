"use client";

import type { ReactElement } from "react";
import { useCallback, useEffect, useState } from "react";
import { Download } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Optional PWA install control — only shown when the browser offers a native install prompt.
 */
export function AppInstallStrip(): ReactElement | null {
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

  if (!installEvent) return null;

  return (
    <div className="sticky top-0 z-[60] border-b border-emerald-500/30 bg-emerald-950/50 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-row items-center justify-end gap-3 px-3 py-2">
        <button
          type="button"
          onClick={() => void onInstall()}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-emerald-400/40 bg-emerald-600/30 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-50 hover:bg-emerald-600/45"
        >
          <Download className="h-3.5 w-3.5" aria-hidden />
          Install app
        </button>
      </div>
    </div>
  );
}
