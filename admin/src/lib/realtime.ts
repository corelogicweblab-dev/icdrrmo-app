"use client";

import { io, type Socket } from "socket.io-client";
import { getWsBaseUrl } from "./env";

export type IncidentCreatedPayload = {
  incidentId: string;
  reporterId: string | null;
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
  socket.on("connect_error", handlers.onConnectError);
  return socket;
}
