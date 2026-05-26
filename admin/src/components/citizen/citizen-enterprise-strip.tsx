"use client";

import type { ReactElement } from "react";
import { Activity } from "lucide-react";
import type { CitizenUnifiedFeed } from "@/lib/citizen-feed";

export function CitizenEnterpriseStrip(props: {
  enterprise: CitizenUnifiedFeed["enterprise"];
  systemHealth: CitizenUnifiedFeed["systemHealth"];
}): ReactElement {
  const alerts = props.enterprise.predictiveAlerts.slice(0, 3);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ring-1 ${
            props.systemHealth.status === "online"
              ? "bg-emerald-950/40 text-emerald-300 ring-emerald-500/35"
              : "bg-amber-950/40 text-amber-200 ring-amber-500/35"
          }`}
        >
          <Activity className="h-3 w-3" aria-hidden />
          {props.systemHealth.label}
        </span>
        {props.enterprise.myBarangayRisk ? (
          <span className="text-[10px] text-zinc-500">
            Risk score:{" "}
            <span className="font-mono text-orange-300/90">
              {props.enterprise.myBarangayRisk.score}
            </span>{" "}
            ({props.enterprise.myBarangayRisk.level})
          </span>
        ) : null}
      </div>

      {alerts.length > 0 ? (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-rose-400/80 mb-2">
            AI forecast · next 6h
          </p>
          <ul className="space-y-1.5">
            {alerts.map((a) => (
              <li
                key={a.barangayName}
                className="rounded-lg border border-rose-500/20 bg-rose-950/20 px-2.5 py-2 text-[11px] text-rose-100/90"
              >
                {a.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
