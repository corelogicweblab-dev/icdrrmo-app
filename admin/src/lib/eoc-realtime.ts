"use client";

import { io, type Socket } from "socket.io-client";
import { getWsBaseUrl } from "./env";

export type EvacuationCenterWsPayload = {
  id: string;
  name: string;
  barangayId: string | null;
  barangayName: string | null;
  latitude: number;
  longitude: number;
  capacity: number | null;
  occupancy: number;
  contactPhone: string | null;
  isActive: boolean;
  createdAt?: string;
};

export function connectEocRealtime(
  accessToken: string,
  handlers: {
    onEvacuationAdded?: (p: EvacuationCenterWsPayload) => void;
    onEvacuationUpdated?: (p: EvacuationCenterWsPayload) => void;
    onIncidentCreated?: (p: {
      incidentId: string;
      latitude?: number | null;
      longitude?: number | null;
      type?: string;
      title?: string | null;
    }) => void;
  },
): Socket {
  const socket = io(`${getWsBaseUrl()}/realtime`, {
    path: "/socket.io",
    auth: { token: accessToken },
    transports: ["websocket", "polling"],
    reconnectionAttempts: Infinity,
  });
  if (handlers.onEvacuationAdded) {
    socket.on("evacuation_center_added", handlers.onEvacuationAdded);
  }
  if (handlers.onEvacuationUpdated) {
    socket.on("evacuation_center_updated", handlers.onEvacuationUpdated);
  }
  if (handlers.onIncidentCreated) {
    socket.on("incident_created", handlers.onIncidentCreated);
  }
  return socket;
}
