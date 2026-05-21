"use client";

import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { Activity, Ambulance, BarChart3, Building2, Users } from "lucide-react";
import { opsFetchJson } from "@/lib/ops-api";

type ExecutiveOverview = {
  governanceKpis: {
    avgResponseMinutes: number | null;
    resolutionRatePct: number;
    incidents7d: number;
    citizenSos7d: number;
    resourceUtilization: {
      vehiclesDeployed: number;
      vehiclesTotal: number;
      respondersOnMission: number;
      respondersTotal: number;
    };
  };
  policyAdvisories: {
    flood: { active: boolean; message?: string | null };
    redZone: { active: boolean; message?: string | null };
  };
  resources: {
    evacuationCenters: Array<{
      name: string;
      utilizationPct: number | null;
      occupancy: number;
      capacity: number;
    }>;
  };
};

export function ChairmanExecutivePanel(props: { accessToken: string }): ReactElement {
  const [data, setData] = useState<ExecutiveOverview | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const o = await opsFetchJson<ExecutiveOverview>(
          "/chairman/executive-overview",
          props.accessToken,
        );
        if (!cancelled) setData(o);
      } catch {
        if (!cancelled) setData(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [props.accessToken]);

  if (!data) {
    return (
      <p className="text-xs text-zinc-500 py-2">Loading executive overview…</p>
    );
  }

  const k = data.governanceKpis;
  const ru = k.resourceUtilization;

  return (
    <div className="space-y-4 rounded-2xl border border-orange-500/20 bg-black/30 p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-orange-400/90">
        Executive governance
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <KpiCard
          icon={BarChart3}
          label="Avg response"
          value={k.avgResponseMinutes != null ? `${k.avgResponseMinutes} min` : "—"}
        />
        <KpiCard icon={Activity} label="Resolution rate" value={`${k.resolutionRatePct}%`} />
        <KpiCard icon={Users} label="Incidents 7d" value={String(k.incidents7d)} />
        <KpiCard icon={Ambulance} label="Citizen SOS" value={String(k.citizenSos7d)} />
      </div>
      <div className="grid gap-2 sm:grid-cols-2 text-xs">
        <div className="rounded-lg border border-white/[0.06] bg-black/25 p-3">
          <p className="text-zinc-500 flex items-center gap-1">
            <Building2 className="h-3.5 w-3.5" /> Resources
          </p>
          <p className="mt-1 text-zinc-200">
            Vehicles {ru.vehiclesDeployed}/{ru.vehiclesTotal} deployed · Responders{" "}
            {ru.respondersOnMission}/{ru.respondersTotal} on mission
          </p>
        </div>
        <div className="rounded-lg border border-white/[0.06] bg-black/25 p-3">
          <p className="text-zinc-500">Policy advisories</p>
          {data.policyAdvisories.flood.active ? (
            <p className="mt-1 text-amber-200/90">Flood: {data.policyAdvisories.flood.message ?? "Active"}</p>
          ) : null}
          {data.policyAdvisories.redZone.active ? (
            <p className="mt-1 text-rose-200/90">Red zone: {data.policyAdvisories.redZone.message ?? "Active"}</p>
          ) : null}
          {!data.policyAdvisories.flood.active && !data.policyAdvisories.redZone.active ? (
            <p className="mt-1 text-zinc-500">No active LGU flood/red-zone flags. PAGASA/GDACS on map.</p>
          ) : null}
        </div>
      </div>
      {data.resources.evacuationCenters.length > 0 ? (
        <div>
          <p className="text-[10px] text-zinc-500 mb-1">Shelter utilization</p>
          <ul className="space-y-1 max-h-24 overflow-y-auto">
            {data.resources.evacuationCenters.map((e) => (
              <li key={e.name} className="flex justify-between text-[11px] text-zinc-400">
                <span className="truncate">{e.name}</span>
                <span className="font-mono text-orange-300/80">
                  {e.utilizationPct != null ? `${e.utilizationPct}%` : `${e.occupancy}/${e.capacity}`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function KpiCard(props: {
  icon: typeof BarChart3;
  label: string;
  value: string;
}): ReactElement {
  const Icon = props.icon;
  return (
    <div className="rounded-xl border border-white/[0.06] bg-black/25 p-2.5">
      <Icon className="h-3.5 w-3.5 text-zinc-500 mb-1" aria-hidden />
      <p className="text-[10px] text-zinc-500">{props.label}</p>
      <p className="text-sm font-semibold text-white">{props.value}</p>
    </div>
  );
}
