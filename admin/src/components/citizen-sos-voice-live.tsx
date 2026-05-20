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
      return "Syncing with voice server…";
    case "standby":
      return "Mic live — waiting for ops desk…";
    case "negotiating":
      return "Linking secure audio…";
    case "live":
      return "Duplex — ops desk on channel";
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
  const { status, error, muted, setMuted, remoteStream, relayConfigured } = useVoiceIncidentCall({
    incidentId,
    active: true,
    accessToken,
    errorAudience: "citizen",
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
    <div className="mt-4 rounded-xl border border-orange-500/15 bg-black/40 p-4 space-y-3">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-orange-300/90">
        <Radio className="h-4 w-4 shrink-0" aria-hidden />
        Browser voice to ops
      </div>
      <p className="text-[11px] text-zinc-400 leading-relaxed">
        This is direct browser-to-browser voice with the ICDRRMO ops desk over your emergency system (signaling goes
        through the same ICDRRMO servers you already use). Keep this page open until the desk answers the flashing alert.
      </p>
      {!relayConfigured && status !== "error" && status !== "idle" && status !== "connecting" ? (
        <p className="text-[10px] leading-relaxed text-amber-200/90 rounded-lg border border-amber-500/25 bg-amber-950/25 px-2.5 py-2">
          On some mobile networks the city operations server must expose a built-in media relay on the same deployment as
          the API so audio can reach the ops browser—your technical team enables this once for the whole program.
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        {status === "error" ? null : status === "live" || status === "standby" ? (
          <span
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium ${
              status === "live"
                ? "bg-orange-950/50 text-orange-200"
                : "bg-amber-950/40 text-amber-100 border border-amber-500/25"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full shrink-0 ${status === "live" ? "bg-orange-400 animate-pulse" : "bg-amber-400 animate-pulse"}`}
              aria-hidden
            />
            {status === "live" ? "Connected" : "Mic on"}
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
          disabled={status === "error" || status === "idle" || status === "connecting"}
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
