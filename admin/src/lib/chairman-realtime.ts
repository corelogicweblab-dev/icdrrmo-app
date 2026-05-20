"use client";

import { io, type Socket } from "socket.io-client";
import { getWsBaseUrl } from "./env";

export type ChairmanIncidentPayload = {
  incidentId: string;
  reporterId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  type?: string;
  title?: string | null;
  feedStatus?: string;
  alarm?: boolean;
  status?: string;
};

export function connectChairmanRealtime(
  accessToken: string,
  handlers: {
    onChairmanIncident: (p: ChairmanIncidentPayload) => void;
    onConnectError?: (err: Error) => void;
  },
): Socket {
  const socket = io(`${getWsBaseUrl()}/realtime`, {
    path: "/socket.io",
    auth: { token: accessToken },
    transports: ["websocket", "polling"],
    reconnectionAttempts: Infinity,
  });
  socket.on("chairman_incident", handlers.onChairmanIncident);
  if (handlers.onConnectError) {
    socket.on("connect_error", handlers.onConnectError);
  }
  return socket;
}
