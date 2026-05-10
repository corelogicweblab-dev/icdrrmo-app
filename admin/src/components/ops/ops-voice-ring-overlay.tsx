"use client";

import type { ReactElement } from "react";
import { useRouter } from "next/navigation";
import { Phone, X } from "lucide-react";
import { useOpsSession } from "@/components/ops/ops-session-context";

/** Full-screen flash when a citizen joins the incident voice room (`voice_incident_ring`). */
export function OpsVoiceRingOverlay(): ReactElement | null {
  const { voiceRing, dismissVoiceRing } = useOpsSession();
  const router = useRouter();

  if (!voiceRing) return null;
  const ring = voiceRing;

  function answer(): void {
    const id = ring.incidentId;
    dismissVoiceRing();
    router.push(`/ops/incidents?focus=${encodeURIComponent(id)}&voiceAnswer=1`);
  }

  function cancel(): void {
    dismissVoiceRing();
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 px-4 py-8 backdrop-blur-md"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="ops-voice-ring-title"
    >
      <div className="animate-voice-ring-flash relative w-full max-w-md rounded-2xl border-2 border-rose-500 bg-[#0a0a0c] p-6">
        <p
          id="ops-voice-ring-title"
          className="text-center text-[10px] font-bold uppercase tracking-[0.35em] text-rose-300"
        >
          Citizen voice channel
        </p>
        <p className="mt-3 text-center text-lg font-bold text-white">Incoming SOS voice</p>
        <p className="mt-2 text-center text-xs text-zinc-400 leading-relaxed">
          A reporter opened the browser microphone for this incident. Answer opens your mic on the same WebRTC room; Cancel
          dismisses this alert.
        </p>
        <p className="mt-4 rounded-lg bg-black/50 px-3 py-2 text-center font-mono text-[11px] text-rose-200/90 break-all">
          {ring.incidentId}
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => answer()}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3.5 text-sm font-bold uppercase tracking-wide text-white shadow-lg hover:bg-rose-500 sm:flex-initial sm:min-w-[140px]"
          >
            <Phone className="h-5 w-5 shrink-0" aria-hidden />
            Answer
          </button>
          <button
            type="button"
            onClick={() => cancel()}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3.5 text-sm font-semibold text-zinc-200 hover:bg-white/[0.1] sm:flex-initial sm:min-w-[140px]"
          >
            <X className="h-5 w-5 shrink-0" aria-hidden />
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
