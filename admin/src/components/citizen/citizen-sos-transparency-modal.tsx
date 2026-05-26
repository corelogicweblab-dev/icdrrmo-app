"use client";

import type { ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Shield } from "lucide-react";
import { getApiBaseUrl } from "@/lib/env";
import { routedAgencyLabel } from "@/lib/incident-routing";

export const SOS_TRANSPARENCY_ITEMS = [
  {
    id: "received",
    label: "I confirm ICDRRMO received my emergency SOS report.",
  },
  {
    id: "location",
    label: "I agree my GPS location was shared so responders can find me.",
  },
  {
    id: "contact",
    label: "I understand EOC or responders may contact me using my registered phone.",
  },
  {
    id: "routing",
    label: "I was informed which agency is handling this case (shown below).",
  },
  {
    id: "track",
    label: "I know I can track response status on the Home tab of this app.",
  },
] as const;

type TransparencyItemId = (typeof SOS_TRANSPARENCY_ITEMS)[number]["id"];

export function CitizenSosTransparencyModal(props: {
  open: boolean;
  incidentId: string;
  accessToken: string;
  emergencyLabel: string;
  routedAgency?: string;
  deduplicated?: boolean;
  onDone: () => void;
}): ReactElement | null {
  const [checks, setChecks] = useState<Record<TransparencyItemId, boolean>>({
    received: false,
    location: false,
    contact: false,
    routing: false,
    track: false,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const allChecked = useMemo(
    () => SOS_TRANSPARENCY_ITEMS.every((item) => checks[item.id]),
    [checks],
  );

  useEffect(() => {
    if (!props.open) return;
    setChecks({
      received: false,
      location: false,
      contact: false,
      routing: false,
      track: false,
    });
    setErr(null);
    setBusy(false);
  }, [props.open, props.incidentId]);

  if (!props.open) return null;

  async function submit(): Promise<void> {
    if (!allChecked) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(
        `${getApiBaseUrl()}/citizen/incidents/${props.incidentId}/sos-transparency`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${props.accessToken}`,
          },
          body: JSON.stringify({ checks }),
        },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(
          typeof data.message === "string" ? data.message : `Could not save (${res.status})`,
        );
      }
      props.onDone();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sos-transparency-title"
    >
      <div className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-2xl border border-orange-500/30 bg-gradient-to-b from-zinc-950 to-black shadow-2xl">
        <div className="border-b border-orange-500/20 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600/20 ring-1 ring-emerald-500/35">
              <Shield className="h-5 w-5 text-emerald-300" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-orange-400/90">
                SOS transparency
              </p>
              <h2 id="sos-transparency-title" className="text-lg font-semibold text-white mt-0.5">
                Report received
              </h2>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                {props.deduplicated
                  ? "Your open report was updated. Please confirm the items below for your records."
                  : "Please check each item below so you know what ICDRRMO did with your SOS."}
              </p>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 space-y-3 text-xs text-zinc-300">
          <dl className="rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2.5 space-y-1">
            <div className="flex justify-between gap-2">
              <dt className="text-zinc-500">Emergency type</dt>
              <dd className="font-medium text-white">{props.emergencyLabel}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-zinc-500">Routed to</dt>
              <dd className="font-medium text-orange-200">
                {routedAgencyLabel(props.routedAgency)}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-zinc-500">Reference ID</dt>
              <dd className="font-mono text-[10px] text-zinc-400 truncate max-w-[58%]">
                {props.incidentId}
              </dd>
            </div>
          </dl>

          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Confirm each item
          </p>
          <ul className="space-y-2.5">
            {SOS_TRANSPARENCY_ITEMS.map((item) => {
              const on = checks[item.id];
              return (
                <li key={item.id}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-orange-500/15 bg-black/35 px-3 py-3 hover:border-orange-500/30">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-600 accent-rose-600"
                      checked={on}
                      onChange={(e) =>
                        setChecks((prev) => ({ ...prev, [item.id]: e.target.checked }))
                      }
                    />
                    <span className={`leading-snug ${on ? "text-zinc-100" : "text-zinc-400"}`}>
                      {item.label}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="border-t border-orange-500/15 px-5 py-4 space-y-2">
          {err ? <p className="text-xs text-rose-300">{err}</p> : null}
          <button
            type="button"
            disabled={!allChecked || busy}
            onClick={() => void submit()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 py-3.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            {busy ? "Saving…" : "Continue to tracking"}
          </button>
          <p className="text-center text-[10px] text-zinc-600">
            Your confirmations are logged for transparency and audit.
          </p>
        </div>
      </div>
    </div>
  );
}
