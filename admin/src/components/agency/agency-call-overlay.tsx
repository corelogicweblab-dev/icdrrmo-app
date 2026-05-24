"use client";

import type { ReactElement } from "react";
import { Phone, X } from "lucide-react";
import type { AgencyCallAlertPayload } from "@/lib/agency-realtime";

type Props = {
  alert: AgencyCallAlertPayload;
  agencyLabel: string;
  onAnswer: () => void;
  onDismiss: () => void;
};

export function AgencyCallOverlay({ alert, agencyLabel, onAnswer, onDismiss }: Props): ReactElement {
  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center bg-black/85 px-4 py-8 backdrop-blur-md"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="agency-call-title"
    >
      <div className="animate-agency-call-flash relative w-full max-w-md rounded-2xl border-2 border-amber-500 bg-[#0a0a0c] p-6 shadow-2xl shadow-amber-900/40">
        <p id="agency-call-title" className="text-center text-[10px] font-bold uppercase tracking-[0.35em] text-amber-300">
          ICDRRMO EOC — Direct call
        </p>
        <p className="mt-3 text-center text-xl font-bold text-white">{agencyLabel} desk alert</p>
        <p className="mt-2 text-center text-sm text-zinc-300 leading-relaxed">{alert.message}</p>
        {alert.incidentId ? (
          <p className="mt-4 rounded-lg bg-black/50 px-3 py-2 text-center font-mono text-[11px] text-amber-200/90 break-all">
            Incident {alert.incidentId}
          </p>
        ) : null}
        <p className="mt-2 text-center text-[10px] text-zinc-500">
          From {alert.opsEmail ?? alert.opsUserId} · {new Date(alert.at).toLocaleTimeString()}
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button type="button" onClick={onAnswer} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-3.5 text-sm font-bold uppercase tracking-wide text-white shadow-lg hover:bg-amber-500 sm:flex-initial sm:min-w-[140px]">
            <Phone className="h-5 w-5 shrink-0" aria-hidden />
            Answer
          </button>
          <button type="button" onClick={onDismiss} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3.5 text-sm font-semibold text-zinc-200 hover:bg-white/[0.1] sm:flex-initial sm:min-w-[140px]">
            <X className="h-5 w-5 shrink-0" aria-hidden />
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
