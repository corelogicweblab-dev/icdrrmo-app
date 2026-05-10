"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { connectIncidentVoiceSocket } from "@/lib/realtime";

const ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];
const VOICE_JOIN_TIMEOUT_MS = 22_000;

type VoiceJoinAck = { ok: boolean; error?: string; peersAlreadyPresent?: number };

type VoiceSignalMsg = {
  incidentId: string;
  type: "offer" | "answer" | "candidate";
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};

type VoicePeerJoinedMsg = {
  incidentId: string;
  userId?: string;
  role?: string;
};

export type VoiceIncidentCallStatus =
  | "idle"
  | "connecting"
  | "joining"
  | "standby"
  | "negotiating"
  | "live"
  | "error";

export type UseVoiceIncidentCallResult = {
  status: VoiceIncidentCallStatus;
  error: string | null;
  muted: boolean;
  setMuted: (v: boolean) => void;
  remoteStream: MediaStream | null;
};

export function useVoiceIncidentCall(opts: {
  incidentId: string | null;
  active: boolean;
  accessToken?: string | null;
  externalSocket?: Socket | null;
}): UseVoiceIncidentCallResult {
  const { incidentId, active, accessToken, externalSocket } = opts;
  const [status, setStatus] = useState<VoiceIncidentCallStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [muted, setMutedState] = useState(false);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const ownedSocketRef = useRef<Socket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const joinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setMuted = useCallback((m: boolean) => {
    setMutedState(m);
    localStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !m;
    });
  }, []);

  useEffect(() => {
    if (!active || !incidentId) {
      setStatus("idle");
      setError(null);
      setRemoteStream(null);
      return;
    }

    const rid = incidentId;

    const useExternal = externalSocket != null;
    if (!useExternal && (!accessToken || accessToken.length === 0)) {
      setStatus("error");
      setError("Missing auth for voice connection.");
      return;
    }

    let disposed = false;
    const socket = useExternal ? externalSocket! : connectIncidentVoiceSocket(accessToken!);
    if (!useExternal) ownedSocketRef.current = socket;

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    const sendSignal = (msg: Omit<VoiceSignalMsg, "incidentId">): void => {
      if (disposed) return;
      socket.emit("voice_signal", { incidentId: rid, ...msg });
    };

    async function ensureMic(): Promise<boolean> {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        if (disposed) {
          s.getTracks().forEach((t) => t.stop());
          return false;
        }
        localStreamRef.current = s;
        s.getAudioTracks().forEach((t) => {
          pc.addTrack(t, s);
        });
        return true;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Microphone blocked.";
        if (!disposed) {
          setError(msg);
          setStatus("error");
        }
        return false;
      }
    }

    async function createAndSendOffer(): Promise<void> {
      if (disposed || !pcRef.current) return;
      const conn = pcRef.current;
      try {
        const offer = await conn.createOffer();
        await conn.setLocalDescription(offer);
        sendSignal({
          type: "offer",
          sdp: offer,
        });
        if (!disposed) setStatus("negotiating");
      } catch (e) {
        if (!disposed) {
          setError(e instanceof Error ? e.message : "WebRTC offer failed");
          setStatus("error");
        }
      }
    }

    async function onPeerJoined(): Promise<void> {
      if (disposed) return;
      if (pc.signalingState !== "stable") return;
      await createAndSendOffer();
    }

    async function onSignal(msg: unknown): Promise<void> {
      if (disposed) return;
      const m = msg as VoiceSignalMsg;
      if (!m || m.incidentId !== rid) return;

      if (m.type === "offer" && m.sdp) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(m.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sendSignal({
            type: "answer",
            sdp: answer,
          });
          if (!disposed) setStatus("negotiating");
        } catch (e) {
          if (!disposed) {
            setError(e instanceof Error ? e.message : "SDP negotiation failed");
            setStatus("error");
          }
        }
        return;
      }

      if (m.type === "answer" && m.sdp) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(m.sdp));
        } catch (e) {
          if (!disposed) setError(e instanceof Error ? e.message : "SDP answer failed");
        }
        return;
      }

      if (m.type === "candidate" && m.candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(m.candidate));
        } catch {
          /* stale */
        }
      }
    }

    const onVoicePeerJoined = (msg: unknown): void => {
      const p = msg as VoicePeerJoinedMsg;
      if (!p || p.incidentId !== rid || disposed) return;
      void onPeerJoined();
    };

    pc.onicecandidate = (ev) => {
      if (disposed || !ev.candidate) return;
      sendSignal({
        type: "candidate",
        candidate: ev.candidate.toJSON(),
      });
    };

    pc.ontrack = (ev) => {
      if (disposed) return;
      const [stream] = ev.streams;
      if (stream) setRemoteStream(stream);
      setStatus("live");
    };

    pc.onconnectionstatechange = () => {
      if (disposed) return;
      if (pc.connectionState === "failed") {
        setError("Voice link failed (strict NAT may need TURN — not configured yet).");
        setStatus("error");
      }
    };

    const onSignalBound = (msg: unknown): void => {
      void onSignal(msg);
    };

    socket.on("voice_signal", onSignalBound);
    socket.on("voice_peer_joined", onVoicePeerJoined);

    const pendingConnectJoinRef: { current: (() => void) | null } = { current: null };

    async function start(): Promise<void> {
      setStatus("connecting");
      setError(null);

      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setStatus("error");
        setError("Microphone needs HTTPS or localhost.");
        return;
      }

      const okMic = await ensureMic();
      if (!okMic || disposed) return;

      setStatus("joining");

      const clearJoinTimer = (): void => {
        if (joinTimeoutRef.current != null) {
          clearTimeout(joinTimeoutRef.current);
          joinTimeoutRef.current = null;
        }
      };

      try {
        await new Promise<void>((resolve, reject) => {
          let settled = false;
          const clearConnectWait = (): void => {
            if (pendingConnectJoinRef.current) {
              socket.off("connect", pendingConnectJoinRef.current);
              pendingConnectJoinRef.current = null;
            }
          };

          const finishOnce = (fn: () => void): void => {
            if (settled) return;
            settled = true;
            clearJoinTimer();
            clearConnectWait();
            socket.off("connect_error", onErr);
            fn();
          };

          const onErr = (err: Error): void => {
            finishOnce(() => reject(err));
          };
          socket.once("connect_error", onErr);

          joinTimeoutRef.current = setTimeout(() => {
            joinTimeoutRef.current = null;
            finishOnce(() =>
              reject(
                new Error(
                  "Voice server did not respond in time. Set NEXT_PUBLIC_WS_URL (or NEXT_PUBLIC_API_URL) so Socket.IO reaches the same host as Nest.",
                ),
              ),
            );
          }, VOICE_JOIN_TIMEOUT_MS);

          const runJoin = (): void => {
            socket.emit("voice_join", { incidentId: rid }, (ack: VoiceJoinAck) => {
              if (settled) return;
              if (disposed) {
                finishOnce(() => resolve());
                return;
              }
              if (!ack?.ok) {
                setError(ack?.error ?? "voice_join rejected");
                setStatus("error");
                finishOnce(() => reject(new Error(ack?.error ?? "voice_join rejected")));
                return;
              }
              if ((ack.peersAlreadyPresent ?? 0) > 0) {
                void createAndSendOffer();
              } else if (!disposed) {
                setStatus("standby");
              }
              finishOnce(() => resolve());
            });
          };

          if (socket.connected) {
            runJoin();
          } else {
            const onConnect = (): void => {
              runJoin();
            };
            pendingConnectJoinRef.current = onConnect;
            socket.once("connect", onConnect);
          }
        });
      } catch (e) {
        clearJoinTimer();
        if (!disposed) {
          setError(e instanceof Error ? e.message : "Voice socket failed");
          setStatus("error");
        }
      }
    }

    void start();

    return () => {
      disposed = true;
      if (joinTimeoutRef.current != null) {
        clearTimeout(joinTimeoutRef.current);
        joinTimeoutRef.current = null;
      }
      if (pendingConnectJoinRef.current) {
        socket.off("connect", pendingConnectJoinRef.current);
        pendingConnectJoinRef.current = null;
      }
      socket.off("voice_signal", onSignalBound);
      socket.off("voice_peer_joined", onVoicePeerJoined);
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.onconnectionstatechange = null;
      pc.close();
      pcRef.current = null;
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      try {
        socket.emit("voice_leave", { incidentId: rid });
      } catch {
        /* ignore */
      }
      if (!useExternal) {
        socket.close();
        ownedSocketRef.current = null;
      }
      setRemoteStream(null);
      setStatus("idle");
    };
  }, [incidentId, active, accessToken, externalSocket]);

  useEffect(() => {
    localStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !muted;
    });
  }, [muted]);

  return { status, error, muted, setMuted, remoteStream };
}
