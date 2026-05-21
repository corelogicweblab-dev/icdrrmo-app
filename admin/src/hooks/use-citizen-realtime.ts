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
      reconnection: true,
      reconnectionAttempts: 12,
    });
    let debounce: ReturnType<typeof setTimeout> | null = null;
    const schedule = (): void => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => cbRef.current(), 400);
    };
    socket.on("connect", () => schedule());
    socket.on("citizen_feed_updated", schedule);
    socket.on("incident_updated", schedule);
    socket.on("incident_created", schedule);
    socket.on("notification_created", schedule);
    return () => {
      if (debounce) clearTimeout(debounce);
      socket.disconnect();
    };
  }, [accessToken]);
}
