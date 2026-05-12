"use client";

import type { ReactElement } from "react";
import { useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { Headphones, Loader2, Mic, MicOff, PhoneOff, Radio } from "lucide-react";
import { useVoiceIncidentCall } from "@/hooks/use-voice-incident-call";

function statusLabel(s: string): string {
  switch (s) {
    case "connecting":
      return "Microphone…";
    case "joining":
      return "Joining voice room…";
    case "standby":
      return "Mic on — citizen may be waiting…";
    case "negotiating":
      return "WebRTC handshake…";
    case "live":
      return "Live duplex";
    case "error":
      return "Error";
    default:
      return "Idle";
  }
}

export function OpsIncidentVoicePanel(props: {
  incidentId: string;
  accessToken: string;
  realtimeSocket: Socket | null;
  socketLive: boolean;
  /** Rising edge: Answer from SOS voice ring — auto-starts browser voice for this incident. */
  autoJoinVoice?: boolean;
}): ReactElement {
  const { incidentId, accessToken, realtimeSocket, socketLive, autoJoinVoice } = props;
  const [active, setActive] = useState(false);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const prevAutoJoin = useRef(false);

  const { status, error, muted, setMuted, remoteStream } = useVoiceIncidentCall({
    incidentId,
    active: active && socketLive && realtimeSocket != null,
    accessToken,
    externalSocket: realtimeSocket ?? undefined,
  });

  useEffect(() => {
    setActive(false);
    prevAutoJoin.current = false;
  }, [incidentId]);

  useEffect(() => {
    if (autoJoinVoice && !prevAutoJoin.current && socketLive && realtimeSocket) {
      setActive(true);
    }
    prevAutoJoin.current = Boolean(autoJoinVoice);
  }, [autoJoinVoice, socketLive, realtimeSocket]);

  useEffect(() => {
    const el = remoteAudioRef.current;
    if (!el || !remoteStream) return;
    el.srcObject = remoteStream;
    void el.play().catch(() => {});
    return () => {
      el.srcObject = null;
    };
  }, [remoteStream]);

  return (
    <div className="rounded-xl border border-sky-500/25 bg-sky-950/20 p-4 space-y-3">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-sky-200/90">
        <Headphones className="h-4 w-4 shrink-0" aria-hidden />
        Citizen browser voice (WebRTC)
      </div>
      <p className="text-[10px] text-zinc-500 leading-relaxed">
        Same room as the citizen SOS page for this incident ID. Requires HTTPS microphone permission on both sides.
      </p>
      {!socketLive ? (
        <p className="text-[11px] text-amber-200/90">Realtime socket offline — reconnect the ops session.</p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        {!active ? (
          <button
            type="button"
            disabled={!socketLive}
            onClick={() => setActive(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-600/90 px-3 py-2 text-[11px] font-semibold text-white hover:bg-sky-500 disabled:opacity-40"
          >
            <Radio className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Join live voice
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setActive(false)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.06] px-3 py-2 text-[11px] font-medium text-zinc-200 hover:bg-white/[0.1]"
            >
              <PhoneOff className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Leave voice
            </button>
            <button
              type="button"
              onClick={() => setMuted(!muted)}
              disabled={status === "error" || status === "idle"}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/12 px-3 py-2 text-[11px] text-zinc-200 disabled:opacity-40"
            >
              {muted ? <MicOff className="h-3.5 w-3.5" aria-hidden /> : <Mic className="h-3.5 w-3.5" aria-hidden />}
              {muted ? "Unmute" : "Mute"}
            </button>
            <span className="text-[10px] text-zinc-500 inline-flex items-center gap-1">
              {status !== "live" && status !== "error" ? (
                <Loader2 className="h-3 w-3 animate-spin shrink-0" aria-hidden />
              ) : null}
              {statusLabel(status)}
            </span>
          </>
        )}
      </div>
      {active && error ? <p className="text-[11px] text-rose-300/95">{error}</p> : null}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
    </div>
  );
}
