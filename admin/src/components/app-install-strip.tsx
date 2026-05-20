"use client";

import type { ReactElement } from "react";
import { useCallback, useEffect, useState } from "react";
import { Download } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Optional PWA install control — flows in document order (no sticky overlap).
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
    <div className="relative z-20 shrink-0 border-b border-orange-500/35 bg-black/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-row items-center justify-end gap-3 px-3 py-2 icd-page-pad">
        <button
          type="button"
          onClick={() => void onInstall()}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-orange-400/45 bg-orange-600/25 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-orange-50 hover:bg-orange-600/40"
        >
          <Download className="h-3.5 w-3.5" aria-hidden />
          Install app
        </button>
      </div>
    </div>
  );
}
