"use client";

import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { Check, Circle, Loader2 } from "lucide-react";
import { fetchCitizenTimeline, type IncidentTimeline } from "@/lib/citizen-feed";

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
        if (!cancelled) setErr("Could not load incident status.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [props.accessToken, props.incidentId]);

  if (err) {
    return <p className="text-xs text-rose-300/90">{err}</p>;
  }
  if (!timeline) {
    return (
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Tracking response…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-orange-400/90">
        SOS lifecycle · {timeline.lifecycle}
      </p>
      <ol className="space-y-2">
        {timeline.steps.map((step) => (
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
