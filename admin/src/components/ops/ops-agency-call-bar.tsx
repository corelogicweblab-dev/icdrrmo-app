"use client";

import type { ReactElement } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Flame, MapPin, Phone, Shield, Siren } from "lucide-react";
import { useOpsSession } from "@/components/ops/ops-session-context";
import { isOpsAuditor } from "@/lib/decode-jwt-role";
import { triggerAgencyCall } from "@/lib/agency-api";
import { barangayRegisterFields, loadBarangaysForStaffSession } from "@/lib/public-barangays";
import { opsFetchJson } from "@/lib/ops-api";

type BarangayOpt = { id: string; name: string; code: string };

type Props = {
  incidentId?: string | null;
  readOnly?: boolean;
  variant?: "hero" | "inline";
};

function resolveIncidentBarangayId(
  incidentId: string | null | undefined,
  queue: Array<{
    id: string;
    barangayId?: string | null;
    barangay?: { id: string } | null;
    reporter?: { profile?: { barangayId?: string | null } | null } | null;
  }>,
): string | null {
  if (!incidentId) return null;
  const row = queue.find((q) => q.id === incidentId);
  if (!row) return null;
  return row.barangayId ?? row.barangay?.id ?? row.reporter?.profile?.barangayId ?? null;
}

/** Ops EOC direct-call — barangay-targeted realtime alerts to agency desks. */
export function OpsAgencyCallBar({
  incidentId,
  readOnly,
  variant = "inline",
}: Props): ReactElement {
  const { tokens, callFocusIncidentId, queue } = useOpsSession();
  const effectiveIncidentId = incidentId ?? callFocusIncidentId;
  const auditor = isOpsAuditor(tokens?.accessToken);
  const disabled = readOnly || auditor || !tokens?.accessToken;

  const [barangays, setBarangays] = useState<BarangayOpt[]>([]);
  const [barangayId, setBarangayId] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [lastMsg, setLastMsg] = useState<string | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const selectedBarangay = useMemo(
    () => barangays.find((b) => b.id === barangayId) ?? null,
    [barangays, barangayId],
  );

  const loadBarangays = useCallback(async () => {
    const token = tokens?.accessToken;
    if (!token) return;
    try {
      const list = await loadBarangaysForStaffSession(token);
      const sorted = list.slice().sort((a, b) => a.name.localeCompare(b.name));
      setBarangays(sorted);
      setLoadErr(null);
      const me = await opsFetchJson<{
        profile: { barangayId: string | null; barangay: BarangayOpt | null } | null;
      }>("/users/me", token);
      const profileBg = me.profile?.barangay?.id ?? me.profile?.barangayId ?? "";
      if (profileBg && sorted.some((b) => b.id === profileBg)) {
        setBarangayId((prev) => prev || profileBg);
      }
    } catch (e: unknown) {
      setLoadErr(e instanceof Error ? e.message : "Could not load barangays — sign in again or open My profile");
    }
  }, [tokens?.accessToken]);

  useEffect(() => {
    void loadBarangays();
  }, [loadBarangays]);

  useEffect(() => {
    const fromIncident = resolveIncidentBarangayId(effectiveIncidentId, queue);
    if (fromIncident) {
      setBarangayId(fromIncident);
    }
  }, [effectiveIncidentId, queue]);

  const canCall = Boolean(barangayId) && !disabled && busy == null;

  async function call(target: "BFP" | "PNP" | "CHAIRMAN"): Promise<void> {
    if (!canCall || !tokens?.accessToken) {
      if (!barangayId) setLastMsg("Select a barangay first.");
      return;
    }
    setBusy(target);
    setLastMsg(null);
    const bg = selectedBarangay;
    const barFields = barangayRegisterFields(barangayId);
    if (!barFields.barangayId && !barFields.barangayCode) {
      setLastMsg("Invalid barangay selection — pick again from the list.");
      setBusy(null);
      return;
    }
    const incId = effectiveIncidentId?.trim();
    try {
      const res = await triggerAgencyCall(tokens.accessToken, {
        target,
        ...barFields,
        ...(incId ? { incidentId: incId } : {}),
        message: bg
          ? `EOC urgent call — ${bg.name} (${bg.code})${
              incId ? ` · incident ${incId.slice(0, 8)}` : ""
            }`
          : undefined,
      });
      setLastMsg(`Sent to ${target} · ${res.barangayName} · call ${res.callId.slice(0, 8)}…`);
    } catch (e: unknown) {
      setLastMsg(e instanceof Error ? e.message : "Call alert failed.");
    } finally {
      setBusy(null);
    }
  }

  const barangaySelect = (
    <label className="block w-full min-w-0">
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300/90">
        Target barangay
      </span>
      <div className="relative mt-1.5">
        <MapPin
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-400/80"
          aria-hidden
        />
        <select
          value={barangayId}
          onChange={(e) => setBarangayId(e.target.value)}
          disabled={disabled || busy != null}
          className="w-full min-h-[44px] appearance-none rounded-xl border border-amber-500/35 bg-black/60 pl-10 pr-4 py-2.5 text-sm text-white outline-none focus:border-amber-400/60 focus:ring-1 focus:ring-amber-500/30 disabled:opacity-50"
          aria-required
        >
          <option value="">— Select barangay —</option>
          {barangays.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} ({b.code})
            </option>
          ))}
        </select>
      </div>
      {loadErr ? <p className="mt-1 text-[10px] text-rose-300">{loadErr}</p> : null}
      {effectiveIncidentId && barangayId ? (
        <p className="mt-1 text-[10px] text-zinc-500">
          Auto-filled from incident · change if rerouting to another barangay
        </p>
      ) : null}
    </label>
  );

  const callButtons = (
    <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-3">
      <button
        type="button"
        disabled={!canCall}
        onClick={() => void call("BFP")}
        className="group flex min-h-[56px] sm:min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-orange-500/60 bg-orange-700 px-3 py-3 text-center font-bold uppercase tracking-wide text-white shadow-lg transition hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed sm:hover:scale-[1.02]"
      >
        <Flame className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden />
        <span className="text-xs sm:text-sm">{busy === "BFP" ? "Calling…" : "Call BFP"}</span>
      </button>
      <button
        type="button"
        disabled={!canCall}
        onClick={() => void call("PNP")}
        className="group flex min-h-[56px] sm:min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-blue-500/50 bg-blue-900 px-3 py-3 text-center font-bold uppercase tracking-wide text-white shadow-lg transition hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed sm:hover:scale-[1.02]"
      >
        <Shield className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden />
        <span className="text-xs sm:text-sm">{busy === "PNP" ? "Calling…" : "Call PNP"}</span>
      </button>
      <button
        type="button"
        disabled={!canCall}
        onClick={() => void call("CHAIRMAN")}
        className="group flex min-h-[56px] sm:min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-violet-500/50 bg-violet-900 px-3 py-3 text-center font-bold uppercase tracking-wide text-white shadow-lg transition hover:bg-violet-800 disabled:opacity-40 disabled:cursor-not-allowed sm:hover:scale-[1.02]"
      >
        <Siren className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden />
        <span className="text-xs sm:text-sm">{busy === "CHAIRMAN" ? "Calling…" : "Call Chairman"}</span>
      </button>
    </div>
  );

  if (variant === "hero") {
    return (
      <section
        className="rounded-2xl border-2 border-amber-500/45 bg-gradient-to-r from-amber-950/50 via-black/60 to-rose-950/40 p-3 sm:p-4 shadow-[0_0_40px_rgba(245,158,11,0.12)]"
        aria-label="Direct agency call controls"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-3 sm:mb-4">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-amber-300">
              EOC direct agency call
            </p>
            <p className="mt-1 text-sm font-semibold text-white">
              Select barangay, then call agency desk
            </p>
            <p className="mt-0.5 text-xs text-zinc-400 break-words">
              Chairman rings only that barangay · PNP/BFP see barangay on alert
              {effectiveIncidentId ? ` · incident ${effectiveIncidentId.slice(0, 10)}…` : ""}
            </p>
          </div>
          <span className="shrink-0 inline-flex items-center gap-1.5 self-start rounded-lg border border-amber-500/30 bg-black/40 px-2.5 py-1 text-[10px] font-semibold text-amber-200">
            <Phone className="h-3.5 w-3.5" aria-hidden />
            Realtime SOS
          </span>
        </div>

        <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-4 lg:items-end">
          {barangaySelect}
          {callButtons}
        </div>

        {lastMsg ? (
          <p className="mt-3 flex items-start gap-1.5 text-xs text-amber-200/90" role="status">
            <Phone className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
            {lastMsg}
          </p>
        ) : !barangayId && !disabled ? (
          <p className="mt-2 text-[11px] text-amber-200/70">Choose a barangay to enable call buttons.</p>
        ) : null}
        {auditor ? (
          <p className="mt-2 text-[10px] text-zinc-500">Auditor accounts cannot trigger agency calls.</p>
        ) : null}
      </section>
    );
  }

  return (
    <div className="rounded-xl border border-amber-500/25 bg-amber-950/20 p-4 space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-300/90">
        Direct agency call (realtime)
      </p>
      {barangaySelect}
      {callButtons}
      {lastMsg ? (
        <p className="text-[11px] text-amber-200/80 flex gap-1.5">
          <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {lastMsg}
        </p>
      ) : null}
    </div>
  );
}
