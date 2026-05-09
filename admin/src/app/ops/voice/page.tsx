"use client";

import type { ReactElement } from "react";
import { Headphones, Mic, MonitorSpeaker, Signal, Speech } from "lucide-react";
import { OpsPanelCard } from "@/components/ops/ops-widgets";

export default function OpsVoicePage(): ReactElement {
  return (
    <div className="p-4 lg:p-6 grid gap-4 lg:grid-cols-12">
      <OpsPanelCard title="Voice communications" subtitle="WebRTC · dispatch bridge · conferencing" className="lg:col-span-6">
        <ul className="space-y-3 text-sm text-zinc-300">
          <li className="flex gap-3">
            <Mic className="h-5 w-5 text-rose-400 shrink-0" aria-hidden /> Responder duplex voice rooms
          </li>
          <li className="flex gap-3">
            <Headphones className="h-5 w-5 text-sky-400 shrink-0" aria-hidden /> Command headset patch groups
          </li>
          <li className="flex gap-3">
            <MonitorSpeaker className="h-5 w-5 text-amber-400 shrink-0" aria-hidden /> Emergency conferencing (moderated)
          </li>
          <li className="flex gap-3">
            <Signal className="h-5 w-5 text-emerald-400 shrink-0" aria-hidden /> PSTN failover bridge (planned)
          </li>
          <li className="flex gap-3">
            <Speech className="h-5 w-5 text-zinc-500 shrink-0" aria-hidden /> Push-to-talk (PTT via WebRTC datachannels)
          </li>
        </ul>
      </OpsPanelCard>
      <OpsPanelCard title="Session controls (stub)" className="lg:col-span-6">
        <div className="grid grid-cols-2 gap-3">
          {["ALPHA-NET", "BFP-LINK", "EMS-CORE", "CITY-OCP"].map((ch) => (
            <button
              key={ch}
              type="button"
              className="rounded-xl border border-white/[0.08] bg-zinc-900/70 py-12 text-xs font-mono uppercase text-zinc-500 hover:border-rose-500/30 hover:text-rose-200 transition"
            >
              {ch}
            </button>
          ))}
        </div>
      </OpsPanelCard>
    </div>
  );
}
