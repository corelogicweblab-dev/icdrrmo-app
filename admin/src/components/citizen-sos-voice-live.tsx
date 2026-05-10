"use client";

import type { ReactElement } from "react";
import { useEffect, useRef } from "react";
import { Mic, MicOff, Radio, Loader2 } from "lucide-react";
import { useVoiceIncidentCall } from "@/hooks/use-voice-incident-call";

function statusLabel(s: string): string {
  switch (s) {
    case "connecting":
      return "Opening microphone…";
    case "joining":
      return "Connecting to ops voice room…";
    case "negotiating":
      return "Linking audio (WebRTC)…";
    case "live":
      return "Live — ops desk can hear you";
    case "error":
      return "Voice link issue";
    default:
      return "Stand by…";
  }
}

export function CitizenSosVoiceLive(props: {
  incidentId: string;
  accessToken: string;
}): ReactElement {
  const { incidentId, accessToken } = props;
  const { status, error, muted, setMuted, remoteStream } = useVoiceIncidentCall({
    incidentId,
    active: true,
    accessToken,
  });
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const el = remoteAudioRef.current;
    if (!el || !remoteStream) return;
    el.srcObject = remoteStream;
    void el.play().catch(() => {
      /* autoplay policy — user gesture already happened on SOS */
    });
    return () => {
      el.srcObject = null;
    };
  }, [remoteStream]);

  return (
    <div className="mt-4 rounded-xl border border-white/[0.08] bg-black/40 p-4 space-y-3">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300/90">
        <Radio className="h-4 w-4 shrink-0" aria-hidden />
        Browser voice to ops
      </div>
      <p className="text-[11px] text-zinc-400 leading-relaxed">
        Your microphone stays open for this incident until you leave this page or sign out. Ops joins from the incidents
        console (same WebRTC room).
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {status === "error" ? null : status === "live" ? (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-950/50 px-2.5 py-1 text-[11px] font-medium text-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" aria-hidden />
            Connected
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900/80 px-2.5 py-1 text-[11px] text-zinc-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" aria-hidden />
            {statusLabel(status)}
          </span>
        )}
        <button
          type="button"
          onClick={() => setMuted(!muted)}
          disabled={status === "error" || status === "idle"}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/12 bg-white/[0.06] px-3 py-1.5 text-[11px] font-medium text-zinc-200 hover:bg-white/[0.1] disabled:opacity-40"
        >
          {muted ? <MicOff className="h-3.5 w-3.5" aria-hidden /> : <Mic className="h-3.5 w-3.5" aria-hidden />}
          {muted ? "Unmute" : "Mute"}
        </button>
      </div>
      {error ? <p className="text-[11px] text-rose-300/95 leading-relaxed">{error}</p> : null}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
    </div>
  );
}
