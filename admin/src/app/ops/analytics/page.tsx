"use client";

import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { Activity, Cpu, Landmark, Radar, Timer } from "lucide-react";
import { useOpsSession } from "@/components/ops/ops-session-context";
import { OpsPanelCard } from "@/components/ops/ops-widgets";
import {
  loadCommandCenterSnapshot,
  type CommandCenterSnapshot,
} from "@/lib/command-center-snapshot";

export default function OpsAnalyticsPage(): ReactElement {
  const { tokens } = useOpsSession();
  const [snap, setSnap] = useState<CommandCenterSnapshot | null>(null);

  useEffect(() => {
    const token = tokens?.accessToken;
    if (!token) return;
    void loadCommandCenterSnapshot(token)
      .then(({ snapshot }) => setSnap(snapshot))
      .catch(() => setSnap(null));
  }, [tokens?.accessToken]);

  const risks = snap?.intelligence.riskMatrix ?? [];
  const maxScore = Math.max(...risks.map((r) => r.score), 1);
  const critical = snap?.liveIncidents.filter((i) => i.urgency === "critical").length ?? 0;
  const engines = [...new Set(risks.map((r) => r.engine).filter(Boolean))];
  const mlActive = engines.some((e) => e?.includes("tensorflow"));

  return (
    <div className="p-4 lg:p-6 grid gap-4 lg:grid-cols-12">
      <OpsPanelCard
        title="Predictive hazard analytics"
        subtitle={mlActive ? "TensorFlow Keras inference" : "Rules fallback (inference offline)"}
        className="lg:col-span-8"
      >
        <div className="flex items-end gap-1 h-[140px]" role="presentation">
          {risks.slice(0, 14).map((r) => (
            <div
              key={r.name}
              title={`${r.name} · ${r.level}`}
              className={`flex-1 rounded-t-sm min-w-[8px] ${
                r.level === "critical"
                  ? "bg-gradient-to-t from-rose-900/50 to-rose-500/70"
                  : r.level === "high"
                    ? "bg-gradient-to-t from-orange-900/40 to-orange-500/60"
                    : "bg-gradient-to-t from-orange-900/20 to-orange-500/35"
              }`}
              style={{ height: `${(r.score / maxScore) * 100}%` }}
            />
          ))}
        </div>
        <p className="mt-3 text-[11px] text-zinc-500">
          Engine:{" "}
          <span className="font-mono text-orange-300/90">
            {engines.length ? engines.join(", ") : "rules-fallback"}
          </span>
          . Features: barangay hazard flags, EOC toggles, rain outlook, open incident load.
        </p>
        {snap?.intelligence.rainOutlook ? (
          <p className="mt-2 text-xs text-orange-200/90">{snap.intelligence.rainOutlook.headline}</p>
        ) : null}
      </OpsPanelCard>
      <OpsPanelCard title="KPI catalog" className="lg:col-span-4">
        <ul className="space-y-2 text-sm text-zinc-400">
          <li className="flex gap-2">
            <Landmark className="h-5 w-5 text-rose-400 shrink-0" aria-hidden />
            High-risk barangays: <span className="text-orange-200">{risks.filter((r) => r.level === "critical").length}</span>
          </li>
          <li className="flex gap-2">
            <Timer className="h-5 w-5 text-orange-400 shrink-0" aria-hidden />
            Critical incidents: <span className="text-orange-200">{critical}</span>
          </li>
          <li className="flex gap-2">
            <Activity className="h-5 w-5 text-orange-400 shrink-0" aria-hidden />
            Heatmap points: <span className="text-orange-200">{snap?.intelligence.heatmapPoints.length ?? 0}</span>
          </li>
          <li className="flex gap-2">
            <Radar className="h-5 w-5 text-amber-400 shrink-0" aria-hidden />
            Incident clustering on Mapbox GIS
          </li>
          <li className="flex gap-2">
            <Cpu className="h-5 w-5 text-orange-400 shrink-0" aria-hidden />
            NLP SMS classification for inbound messages
          </li>
        </ul>
      </OpsPanelCard>
    </div>
  );
}
