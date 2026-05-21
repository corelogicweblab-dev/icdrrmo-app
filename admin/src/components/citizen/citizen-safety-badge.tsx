"use client";

import type { ReactElement } from "react";
import { AlertTriangle, Shield, ShieldAlert } from "lucide-react";
import type { CitizenSafetyStatus } from "@/lib/citizen-feed";

const STYLES: Record<
  CitizenSafetyStatus,
  { bg: string; ring: string; icon: typeof Shield; label: string }
> = {
  safe: {
    bg: "bg-emerald-950/50 text-emerald-200",
    ring: "ring-emerald-500/40",
    icon: Shield,
    label: "Safe",
  },
  caution: {
    bg: "bg-amber-950/50 text-amber-200",
    ring: "ring-amber-500/40",
    icon: AlertTriangle,
    label: "Caution",
  },
  evacuate: {
    bg: "bg-rose-950/60 text-rose-100",
    ring: "ring-rose-500/50",
    icon: ShieldAlert,
    label: "Evacuate",
  },
};

export function CitizenSafetyBadge(props: {
  status: CitizenSafetyStatus;
}): ReactElement {
  const s = STYLES[props.status];
  const Icon = s.icon;
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider ring-1 ${s.bg} ${s.ring}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      <span>{s.label}</span>
    </div>
  );
}
