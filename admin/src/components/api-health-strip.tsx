"use client";

import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { getApiBaseUrl } from "@/lib/env";
import { pingApiHealth } from "@/lib/api-fetch";

type Status = "checking" | "online" | "offline";

export function ApiHealthStrip(): ReactElement {
  const [status, setStatus] = useState<Status>("checking");
  const [detail, setDetail] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const r = await pingApiHealth();
      if (cancelled) return;
      setStatus(r.ok ? "online" : "offline");
      setDetail(r.message);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const apiHost = (() => {
    try {
      return new URL(getApiBaseUrl()).host;
    } catch {
      return getApiBaseUrl();
    }
  })();

  return (
    <div
      className={`shrink-0 border-b px-3 py-1.5 text-center text-[10px] font-medium ${
        status === "online"
          ? "border-emerald-500/20 bg-emerald-950/30 text-emerald-200/90"
          : status === "offline"
            ? "border-amber-500/35 bg-amber-950/40 text-amber-100"
            : "border-white/5 bg-black/40 text-zinc-500"
      }`}
      role="status"
    >
      {status === "checking" ? (
        <span className="inline-flex items-center justify-center gap-1.5">
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
          Connecting to emergency API ({apiHost})…
        </span>
      ) : status === "online" ? (
        <span className="inline-flex items-center justify-center gap-1.5">
          <CheckCircle2 className="h-3 w-3" aria-hidden />
          API online · {apiHost} — sign-in, SOS, and live data ready
        </span>
      ) : (
        <span className="inline-flex items-center justify-center gap-1.5">
          <AlertTriangle className="h-3 w-3" aria-hidden />
          {detail || `Emergency API (${apiHost}) is slow or offline. Wait up to 90s, then retry.`}
        </span>
      )}
    </div>
  );
}
