"use client";

import type { ReactElement } from "react";
import { useOpsSession } from "@/components/ops/ops-session-context";
import { getApiBaseUrl } from "@/lib/env";
import { OpsPanelCard } from "@/components/ops/ops-widgets";

export default function OpsSettingsPage(): ReactElement {
  const { soundMuted, setSoundMuted } = useOpsSession();

  return (
    <div className="p-4 lg:p-6 grid gap-4 max-w-3xl">
      <OpsPanelCard title="Console preferences">
        <label className="flex items-center justify-between gap-4 py-3 border-b border-white/[0.04] cursor-pointer">
          <div>
            <p className="text-sm font-medium text-white">Alert chime</p>
            <p className="text-[11px] text-zinc-500">Brief tone when new SOS hits /realtime</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={!soundMuted}
            onClick={() => setSoundMuted(!soundMuted)}
            className={`relative h-7 w-12 rounded-full transition ${soundMuted ? "bg-zinc-800" : "bg-orange-600"}`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${soundMuted ? "left-1" : "left-6"}`}
            />
          </button>
        </label>
        <div className="pt-4 text-xs text-zinc-500 space-y-2">
          <p>
            API base: <span className="font-mono text-zinc-400">{getApiBaseUrl()}</span>
          </p>
          <p>Multi-monitor: use browser fullscreen on each display; PWA per screen optional.</p>
        </div>
      </OpsPanelCard>
    </div>
  );
}
