"use client";

import { io, type Socket } from "socket.io-client";
import { getWsBaseUrl } from "./env";

export type AgencyCallAlertPayload = {
  callId: string;
  target: "BFP" | "PNP" | "CHAIRMAN";
  incidentId: string | null;
  barangayId: string;
  barangayName: string;
  barangayCode?: string;
  message: string;
  opsUserId: string;
  opsEmail: string | null;
  at: string;
};

export type AgencyIncidentPayload = {
  incidentId: string;
  reporterId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  type?: string;
  title?: string | null;
  routedAgency?: string | null;
};

export function connectAgencyRealtime(
  accessToken: string,
  handlers: {
    onAgencyIncident?: (p: AgencyIncidentPayload) => void;
    onAgencyCallAlert?: (p: AgencyCallAlertPayload) => void;
    onConnectError?: (err: Error) => void;
  },
): Socket {
  const socket = io(`${getWsBaseUrl()}/realtime`, {
    path: "/socket.io",
    auth: { token: accessToken },
    transports: ["websocket", "polling"],
    reconnectionAttempts: Infinity,
  });
  if (handlers.onAgencyIncident) {
    socket.on("agency_incident", handlers.onAgencyIncident);
  }
  if (handlers.onAgencyCallAlert) {
    socket.on("agency_call_alert", handlers.onAgencyCallAlert);
  }
  if (handlers.onConnectError) {
    socket.on("connect_error", handlers.onConnectError);
  }
  return socket;
}

export function connectChairmanAgencyCallRealtime(
  accessToken: string,
  handlers: {
    onAgencyCallAlert: (p: AgencyCallAlertPayload) => void;
    onConnectError?: (err: Error) => void;
  },
): Socket {
  const socket = io(`${getWsBaseUrl()}/realtime`, {
    path: "/socket.io",
    auth: { token: accessToken },
    transports: ["websocket", "polling"],
    reconnectionAttempts: Infinity,
  });
  socket.on("agency_call_alert", handlers.onAgencyCallAlert);
  if (handlers.onConnectError) {
    socket.on("connect_error", handlers.onConnectError);
  }
  return socket;
}
