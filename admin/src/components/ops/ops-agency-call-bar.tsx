"use client";

import type { ReactElement } from "react";
import { useState } from "react";
import { Flame, Phone, Shield, Siren } from "lucide-react";
import { useOpsSession } from "@/components/ops/ops-session-context";
import { isOpsAuditor } from "@/lib/decode-jwt-role";
import { triggerAgencyCall } from "@/lib/agency-api";

type Props = {
  incidentId?: string | null;
  readOnly?: boolean;
  /** Hero = large EOC dashboard strip; inline = incident desk panel */
  variant?: "hero" | "inline";
};

/** Ops EOC direct-call buttons — realtime WebSocket alert to agency desks. */
export function OpsAgencyCallBar({
  incidentId,
  readOnly,
  variant = "inline",
}: Props): ReactElement {
  const { tokens, callFocusIncidentId } = useOpsSession();
  const effectiveIncidentId = incidentId ?? callFocusIncidentId;
  const auditor = isOpsAuditor(tokens?.accessToken);
  const disabled = readOnly || auditor || !tokens?.accessToken;
  const [busy, setBusy] = useState<string | null>(null);
  const [lastMsg, setLastMsg] = useState<string | null>(null);

  async function call(target: "BFP" | "PNP" | "CHAIRMAN"): Promise<void> {
    if (disabled || busy) return;
    setBusy(target);
    setLastMsg(null);
    try {
      const res = await triggerAgencyCall(tokens!.accessToken, {
        target,
        incidentId: effectiveIncidentId ?? undefined,
        message:
          effectiveIncidentId != null
            ? `EOC requests immediate contact regarding incident ${effectiveIncidentId.slice(0, 8)}…`
            : "ICDRRMO EOC requests immediate voice contact.",
      });
      setLastMsg(`Alert sent to ${target} · call ${res.callId.slice(0, 8)}…`);
    } catch (e: unknown) {
      setLastMsg(e instanceof Error ? e.message : "Call alert failed — redeploy API or sign in again.");
    } finally {
      setBusy(null);
    }
  }

  if (variant === "hero") {
    return (
      <section
        className="rounded-2xl border-2 border-amber-500/45 bg-gradient-to-r from-amber-950/50 via-black/60 to-rose-950/40 p-4 shadow-[0_0_40px_rgba(245,158,11,0.12)]"
        aria-label="Direct agency call controls"
      >
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-amber-300">
              EOC direct agency call
            </p>
            <p className="mt-1 text-sm font-semibold text-white">
              Realtime SOS — ringtone + vibrate on agency desks
            </p>
            <p className="mt-0.5 text-xs text-zinc-400">
              {effectiveIncidentId
                ? `Linked to incident ${effectiveIncidentId.slice(0, 12)}…`
                : "No incident selected — general EOC call to desk"}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-black/40 px-2.5 py-1 text-[10px] font-semibold text-amber-200">
            <Phone className="h-3.5 w-3.5" aria-hidden />
            WebSocket + voice bridge
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <button
            type="button"
            disabled={disabled || busy != null}
            onClick={() => void call("BFP")}
            className="group flex min-h-[72px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-orange-500/60 bg-orange-700 px-4 py-4 text-center font-bold uppercase tracking-wide text-white shadow-lg transition hover:bg-orange-600 hover:shadow-orange-900/40 disabled:opacity-45 disabled:cursor-not-allowed animate-alert-blink sm:animate-none sm:hover:scale-[1.02]"
          >
            <Flame className="h-8 w-8 opacity-95 group-hover:scale-110 transition" aria-hidden />
            <span className="text-sm">{busy === "BFP" ? "Calling BFP…" : "Call BFP"}</span>
            <span className="text-[9px] font-normal normal-case tracking-normal text-orange-100/80">
              Fire bureau desk
            </span>
          </button>
          <button
            type="button"
            disabled={disabled || busy != null}
            onClick={() => void call("PNP")}
            className="group flex min-h-[72px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-blue-500/50 bg-blue-900 px-4 py-4 text-center font-bold uppercase tracking-wide text-white shadow-lg transition hover:bg-blue-800 hover:shadow-blue-900/40 disabled:opacity-45 disabled:cursor-not-allowed sm:hover:scale-[1.02]"
          >
            <Shield className="h-8 w-8 opacity-95 group-hover:scale-110 transition" aria-hidden />
            <span className="text-sm">{busy === "PNP" ? "Calling PNP…" : "Call PNP"}</span>
            <span className="text-[9px] font-normal normal-case tracking-normal text-blue-100/80">
              Police desk
            </span>
          </button>
          <button
            type="button"
            disabled={disabled || busy != null}
            onClick={() => void call("CHAIRMAN")}
            className="group flex min-h-[72px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-violet-500/50 bg-violet-900 px-4 py-4 text-center font-bold uppercase tracking-wide text-white shadow-lg transition hover:bg-violet-800 hover:shadow-violet-900/40 disabled:opacity-45 disabled:cursor-not-allowed sm:hover:scale-[1.02]"
          >
            <Siren className="h-8 w-8 opacity-95 group-hover:scale-110 transition" aria-hidden />
            <span className="text-sm">{busy === "CHAIRMAN" ? "Calling…" : "Call Chairman"}</span>
            <span className="text-[9px] font-normal normal-case tracking-normal text-violet-100/80">
              Barangay chairman
            </span>
          </button>
        </div>
        {lastMsg ? (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-amber-200/90" role="status">
            <Phone className="h-4 w-4 shrink-0" aria-hidden />
            {lastMsg}
          </p>
        ) : null}
        {auditor ? (
          <p className="mt-2 text-[10px] text-zinc-500">Auditor accounts cannot trigger agency calls.</p>
        ) : null}
      </section>
    );
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
          disabled={disabled || busy != null}
          onClick={() => void call("BFP")}
          className="inline-flex items-center gap-2 rounded-lg bg-orange-700 px-3 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-orange-600 disabled:opacity-50"
        >
          <Flame className="h-4 w-4" aria-hidden />
          {busy === "BFP" ? "Calling…" : "Call BFP"}
        </button>
        <button
          type="button"
          disabled={disabled || busy != null}
          onClick={() => void call("PNP")}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-3 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-blue-800 disabled:opacity-50"
        >
          <Shield className="h-4 w-4" aria-hidden />
          {busy === "PNP" ? "Calling…" : "Call PNP"}
        </button>
        <button
          type="button"
          disabled={disabled || busy != null}
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
