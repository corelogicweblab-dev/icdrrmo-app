"use client";

import type { ReactElement } from "react";
import { useState } from "react";
import { Flame, Phone, Shield, Siren } from "lucide-react";
import { useOpsSession } from "@/components/ops/ops-session-context";
import { triggerAgencyCall } from "@/lib/agency-api";

type Props = {
  incidentId?: string | null;
  readOnly?: boolean;
};

/** Ops EOC direct-call buttons — realtime WebSocket alert to agency desks. */
export function OpsAgencyCallBar({ incidentId, readOnly }: Props): ReactElement {
  const { tokens } = useOpsSession();
  const [busy, setBusy] = useState<string | null>(null);
  const [lastMsg, setLastMsg] = useState<string | null>(null);

  async function call(target: "BFP" | "PNP" | "CHAIRMAN"): Promise<void> {
    if (readOnly || !tokens?.accessToken) return;
    setBusy(target);
    setLastMsg(null);
    try {
      const res = await triggerAgencyCall(tokens.accessToken, {
        target,
        incidentId: incidentId ?? undefined,
        message:
          incidentId != null
            ? `EOC requests immediate contact regarding incident ${incidentId.slice(0, 8)}…`
            : "ICDRRMO EOC requests immediate voice contact.",
      });
      setLastMsg(`Alert sent to ${target} · call ${res.callId.slice(0, 8)}…`);
    } catch (e: unknown) {
      setLastMsg(e instanceof Error ? e.message : "Call alert failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-xl border border-amber-500/25 bg-amber-950/20 p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-300/90">
        Direct agency call (realtime)
      </p>
      <p className="mt-1 text-xs text-zinc-400">
        Triggers forced ringtone + vibrate on the target dashboard. Answer opens browser voice bridge.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={readOnly || busy != null}
          onClick={() => void call("BFP")}
          className="inline-flex items-center gap-2 rounded-lg bg-orange-700 px-3 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-orange-600 disabled:opacity-50"
        >
          <Flame className="h-4 w-4" aria-hidden />
          {busy === "BFP" ? "Calling…" : "Call BFP"}
        </button>
        <button
          type="button"
          disabled={readOnly || busy != null}
          onClick={() => void call("PNP")}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-3 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-blue-800 disabled:opacity-50"
        >
          <Shield className="h-4 w-4" aria-hidden />
          {busy === "PNP" ? "Calling…" : "Call PNP"}
        </button>
        <button
          type="button"
          disabled={readOnly || busy != null}
          onClick={() => void call("CHAIRMAN")}
          className="inline-flex items-center gap-2 rounded-lg bg-violet-900 px-3 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-violet-800 disabled:opacity-50"
        >
          <Siren className="h-4 w-4" aria-hidden />
          {busy === "CHAIRMAN" ? "Calling…" : "Call Chairman"}
        </button>
      </div>
      {lastMsg ? (
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-200/80">
          <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {lastMsg}
        </p>
      ) : null}
    </div>
  );
}
