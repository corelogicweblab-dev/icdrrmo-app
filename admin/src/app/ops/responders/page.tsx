"use client";

import type { ReactElement } from "react";
import {
  Activity,
  Briefcase,
  Calendar,
  MapPin,
  MessageCircle,
  Radio,
  Shield,
} from "lucide-react";
import { TARGET_RESPONDER_STATUSES } from "@/components/ops/ops-nav";
import { OpsPanelCard } from "@/components/ops/ops-widgets";

const UNITS = [
  { name: "Alpha Rescue Squad", type: "Rescue", zone: "CBD", status: "available" },
  { name: "ECHO-1 EMS", type: "Ambulance", zone: "East", status: "en_route" },
  { name: "BFP Isabela Engine 2", type: "Fire", zone: "Harbor", status: "busy" },
  { name: "PNP Mobile 14", type: "Police", zone: "Coastal", status: "dispatched" },
  { name: "DRRM Medical Team", type: "Medical", zone: "EOC", status: "offline" },
];

export default function OpsRespondersPage(): ReactElement {
  return (
    <div className="p-4 lg:p-6 grid gap-4 lg:grid-cols-12">
      <OpsPanelCard title="Responder management" subtitle="Live GPS · status · shifts · comms" className="lg:col-span-8">
        <div className="flex flex-wrap gap-2 mb-4">
          {TARGET_RESPONDER_STATUSES.map((s) => (
            <span key={s} className="rounded-md border border-white/10 px-2 py-1 text-[10px] uppercase text-zinc-500">
              {s.replace(/_/g, " ")}
            </span>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="text-[10px] uppercase tracking-wider text-zinc-500 border-b border-white/[0.06]">
              <tr>
                <th className="py-2 pr-4">Unit</th>
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 pr-4">Zone</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {UNITS.map((u) => (
                <tr key={u.name} className="border-b border-white/[0.04] text-zinc-300">
                  <td className="py-2.5 pr-4 font-medium text-white">{u.name}</td>
                  <td className="py-2.5 pr-4">{u.type}</td>
                  <td className="py-2.5 pr-4 font-mono text-zinc-500">{u.zone}</td>
                  <td className="py-2.5">
                    <span className="inline-flex items-center gap-1 rounded bg-white/[0.05] px-2 py-1 text-[10px] uppercase text-amber-200/90">
                      <Activity className="h-3 w-3" aria-hidden />
                      {u.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </OpsPanelCard>
      <OpsPanelCard title="Field tools">
        <ul className="space-y-3 text-sm text-zinc-400">
          <li className="flex gap-2 items-center">
            <MapPin className="h-4 w-4 text-sky-400" aria-hidden /> Live GPS tracking layer
          </li>
          <li className="flex gap-2 items-center">
            <Calendar className="h-4 w-4 text-amber-400" aria-hidden /> Shift scheduling + handover
          </li>
          <li className="flex gap-2 items-center">
            <Briefcase className="h-4 w-4 text-emerald-400" aria-hidden /> Vehicle assignment board
          </li>
          <li className="flex gap-2 items-center">
            <MessageCircle className="h-4 w-4 text-violet-400" aria-hidden /> Team comms (SMS / push / voice)
          </li>
          <li className="flex gap-2 items-center">
            <Radio className="h-4 w-4 text-rose-400" aria-hidden /> PTT bridge (see Voice panel)
          </li>
        </ul>
        <p className="mt-4 text-[10px] text-zinc-600 flex items-start gap-2">
          <Shield className="h-4 w-4 shrink-0" aria-hidden />
          Prisma enums: AVAILABLE, DISPATCHED, EN_ROUTE — align UI labels with baseline data model.
        </p>
      </OpsPanelCard>
    </div>
  );
}
