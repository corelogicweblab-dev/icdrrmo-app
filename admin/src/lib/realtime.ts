"use client";

import { io, type Socket } from "socket.io-client";
import { getWsBaseUrl } from "./env";

export type IncidentCreatedPayload = {
  incidentId: string;
  reporterId: string | null;
  /** Present for SOS / ops-created incidents — ops UI can pin before REST refresh completes. */
  latitude?: number | null;
  longitude?: number | null;
  type?: string;
  title?: string | null;
};

export type IncidentUpdatedPayload = {
  incidentId: string;
  status?: string;
  reporterId?: string | null;
};

export function connectOpsRealtime(
  accessToken: string,
  handlers: {
    onIncidentCreated: (p: IncidentCreatedPayload) => void;
    onIncidentUpdated?: (p: IncidentUpdatedPayload) => void;
    onEvacuationCenterAdded?: (p: import("./eoc-realtime").EvacuationCenterWsPayload) => void;
    onConnectError: (err: Error) => void;
  },
): Socket {
  const base = getWsBaseUrl();
  const socket = io(`${base}/realtime`, {
    path: "/socket.io",
    auth: { token: accessToken },
    transports: ["websocket", "polling"],
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10_000,
  });
  socket.on("incident_created", handlers.onIncidentCreated);
  if (handlers.onIncidentUpdated) {
    socket.on("incident_updated", handlers.onIncidentUpdated);
  }
  if (handlers.onEvacuationCenterAdded) {
    socket.on("evacuation_center_added", handlers.onEvacuationCenterAdded);
  }
  socket.on("connect_error", handlers.onConnectError);
  return socket;
}

/** Dedicated Socket.IO client for incident voice (WebRTC signaling). Caller owns lifecycle (close on unmount). */
export function connectIncidentVoiceSocket(accessToken: string): Socket {
  const base = getWsBaseUrl();
  return io(`${base}/realtime`, {
    path: "/socket.io",
    auth: { token: accessToken },
    transports: ["websocket", "polling"],
    reconnectionAttempts: 8,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10_000,
  });
}
