"use client";

import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { opsFetchJson } from "@/lib/ops-api";

type TimelineEntry = {
  id: string;
  action: string;
  at: string;
  actor: string;
  role?: string | null;
  details?: unknown;
};

type Props = {
  incidentId: string;
  accessToken: string | undefined;
};

export function IncidentTimeline(props: Props): ReactElement {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!props.accessToken || !props.incidentId) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await opsFetchJson<{ entries: TimelineEntry[] }>(
          `/incidents/${props.incidentId}/timeline`,
          props.accessToken!,
        );
        if (!cancelled) setEntries(data.entries);
      } catch (e: unknown) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Timeline unavailable");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [props.incidentId, props.accessToken]);

  if (err) return <p className="text-xs text-rose-300">{err}</p>;
  if (!entries.length) return <p className="text-xs text-zinc-500">No timeline entries yet.</p>;

  return (
    <ol className="relative border-l border-orange-500/25 pl-4 space-y-3">
      {entries.map((e) => (
        <li key={e.id} className="text-xs">
          <span className="absolute -left-[5px] mt-1.5 h-2 w-2 rounded-full bg-orange-500 ring-2 ring-black" aria-hidden />
          <p className="font-mono text-[10px] text-zinc-600">{new Date(e.at).toLocaleString("en-PH")}</p>
          <p className="font-semibold text-orange-200/95 uppercase tracking-wide">{e.action.replace(/_/g, " ")}</p>
          <p className="text-zinc-500">{e.actor}{e.role ? ` · ${e.role}` : ""}</p>
        </li>
      ))}
    </ol>
  );
}
