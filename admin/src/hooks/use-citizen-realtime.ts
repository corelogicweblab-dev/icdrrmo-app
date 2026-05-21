"use client";

import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { getApiBaseUrl } from "@/lib/env";

export function useCitizenRealtime(
  accessToken: string | null,
  onFeedUpdated: () => void,
): void {
  const cbRef = useRef(onFeedUpdated);
  cbRef.current = onFeedUpdated;

  useEffect(() => {
    if (!accessToken) return;
    const base = getApiBaseUrl().replace(/\/api\/v1\/?$/, "");
    const socket: Socket = io(`${base}/realtime`, {
      auth: { token: accessToken },
      transports: ["websocket", "polling"],
    });
    socket.on("citizen_feed_updated", () => cbRef.current());
    socket.on("incident_updated", () => cbRef.current());
    socket.on("incident_created", () => cbRef.current());
    return () => {
      socket.disconnect();
    };
  }, [accessToken]);
}
