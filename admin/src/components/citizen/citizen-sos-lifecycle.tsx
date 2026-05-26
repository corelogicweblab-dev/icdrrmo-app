"use client";

import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { Check, Circle } from "lucide-react";
import { fetchCitizenTimeline, type IncidentTimeline } from "@/lib/citizen-feed";

const PLACEHOLDER_STEPS: IncidentTimeline["steps"] = [
  { key: "reported", label: "Report received", done: true, at: null },
  { key: "verified", label: "Verified by EOC", done: false, at: null },
  { key: "responded", label: "Responder dispatched", done: false, at: null },
  { key: "resolved", label: "Resolved", done: false, at: null },
];

export function CitizenSosLifecycle(props: {
  accessToken: string;
  incidentId: string;
}): ReactElement {
  const [timeline, setTimeline] = useState<IncidentTimeline | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const t = await fetchCitizenTimeline(props.accessToken, props.incidentId);
        if (!cancelled) setTimeline(t);
      } catch {
        if (!cancelled) setErr("Status will update automatically when EOC responds.");
      }
    })();
    const poll = window.setInterval(() => {
      void fetchCitizenTimeline(props.accessToken, props.incidentId)
        .then((t) => {
          if (!cancelled) setTimeline(t);
        })
        .catch(() => {});
    }, 12_000);
    return () => {
      cancelled = true;
      window.clearInterval(poll);
    };
  }, [props.accessToken, props.incidentId]);

  const steps = timeline?.steps ?? PLACEHOLDER_STEPS;
  const lifecycle = timeline?.lifecycle ?? "reported";

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-orange-400/90">
        SOS lifecycle · {lifecycle}
      </p>
      {err && !timeline ? (
        <p className="text-xs text-zinc-500">{err}</p>
      ) : null}
      <ol className="space-y-2">
        {steps.map((step) => (
          <li key={step.key} className="flex items-center gap-3 text-xs">
            {step.done ? (
              <Check className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
            ) : (
              <Circle className="h-4 w-4 shrink-0 text-zinc-600" aria-hidden />
            )}
            <span className={step.done ? "text-zinc-200" : "text-zinc-500"}>{step.label}</span>
            {step.at ? (
              <span className="ml-auto font-mono text-[10px] text-zinc-600">
                {new Date(step.at).toLocaleTimeString()}
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
