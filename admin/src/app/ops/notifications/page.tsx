"use client";

import type { ReactElement } from "react";
import { useState } from "react";
import { Bell, Megaphone, Send, Smartphone } from "lucide-react";
import { OpsPanelCard } from "@/components/ops/ops-widgets";

const FILTERS = ["Barangay", "Zone", "Incident type", "Risk level"] as const;

export default function OpsNotificationsPage(): ReactElement {
  const [targets, setTargets] = useState({ bg: "", zone: "", type: "", risk: "medium" });

  return (
    <div className="p-4 lg:p-6 grid gap-4 lg:grid-cols-12">
      <OpsPanelCard title="Broadcast composer" subtitle="Push · SMS · citywide evacuation" className="lg:col-span-7">
        <div className="grid sm:grid-cols-2 gap-3 mb-4">
          {FILTERS.map((f) => (
            <label key={f} className="block text-[10px] uppercase tracking-wider text-zinc-500">
              {f}
              <input
                placeholder="Filter value"
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-rose-500/40 focus:ring-1 focus:ring-rose-500/30"
                value={
                  f === "Barangay"
                    ? targets.bg
                    : f === "Zone"
                      ? targets.zone
                      : f === "Incident type"
                        ? targets.type
                        : targets.risk
                }
                onChange={(e) =>
                  setTargets((t) =>
                    f === "Barangay"
                      ? { ...t, bg: e.target.value }
                      : f === "Zone"
                        ? { ...t, zone: e.target.value }
                        : f === "Incident type"
                          ? { ...t, type: e.target.value }
                          : { ...t, risk: e.target.value },
                  )
                }
              />
            </label>
          ))}
        </div>
        <textarea
          placeholder="Compose emergency message — ICS standard format encouraged"
          className="w-full min-h-[160px] rounded-xl border border-zinc-800 bg-black/40 p-4 text-sm text-white outline-none focus:border-rose-500/40"
        />
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600/85 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition"
          >
            <Smartphone className="h-4 w-4" aria-hidden /> Push blast
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.05] px-4 py-2 text-xs font-semibold text-white hover:bg-white/[0.08]"
          >
            <Send className="h-4 w-4" aria-hidden /> SMS gateway
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-950/30 px-4 py-2 text-xs font-semibold text-amber-100 hover:bg-amber-950/50"
          >
            <Megaphone className="h-4 w-4" aria-hidden /> Evacuation warning
          </button>
        </div>
      </OpsPanelCard>
      <OpsPanelCard title="Channels" subtitle="FCM/APNs hooks + templated ICS bulletins">
        <ul className="space-y-3 text-sm text-zinc-400">
          <li className="flex gap-2">
            <Bell className="h-5 w-5 text-rose-400 shrink-0" aria-hidden />
            Citizen mobile push bundles (risk cadence capped)
          </li>
          <li className="flex gap-2">
            <Send className="h-5 w-5 text-sky-400 shrink-0" aria-hidden />
            Barangay captains WhatsApp relay (manual bridge)
          </li>
          <li className="flex gap-2">
            <Megaphone className="h-5 w-5 text-amber-400 shrink-0" aria-hidden />
            Citywide loud-hailer playbook export
          </li>
        </ul>
      </OpsPanelCard>
    </div>
  );
}
