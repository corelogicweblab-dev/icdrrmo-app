"use client";

import type { ComponentType, ReactElement } from "react";

export function OpsStatusCapsule(props: {
  icon: ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>;
  label: string;
  state: "good" | "bad" | "idle";
  detail: string;
}): ReactElement {
  const Icon = props.icon;
  const ring =
    props.state === "good"
      ? "ring-emerald-500/35 border-emerald-500/22"
      : props.state === "bad"
        ? "ring-rose-500/40 border-rose-500/28"
        : "ring-white/12 border-white/10";
  const dot =
    props.state === "good"
      ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.65)] animate-live-pulse"
      : props.state === "bad"
        ? "bg-rose-500"
        : "bg-zinc-500";
  return (
    <div
      className={`flex min-w-[10rem] max-w-[240px] items-start gap-2.5 rounded-xl border px-3.5 py-2.5 ${ring}`}
    >
      <Icon className="mt-0.5 h-4 w-4 text-zinc-500 shrink-0" strokeWidth={1.35} aria-hidden />
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${dot}`} aria-hidden />
          <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-300">
            {props.label}
          </span>
        </div>
        <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-zinc-500">{props.detail}</p>
      </div>
    </div>
  );
}

export function OpsKpiCard(props: {
  icon: ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>;
  label: string;
  value: string;
  subtitle: string;
  accent: "rose" | "emerald" | "sky" | "zinc" | "amber";
}): ReactElement {
  const Icon = props.icon;
  const overlays = {
    rose: "bg-rose-500/[0.09]",
    emerald: "bg-emerald-500/[0.09]",
    sky: "bg-sky-500/[0.08]",
    zinc: "bg-zinc-500/[0.06]",
    amber: "bg-amber-500/[0.08]",
  } as const;
  const iconHue = {
    rose: "text-rose-200",
    emerald: "text-emerald-200",
    sky: "text-sky-200",
    zinc: "text-zinc-200",
    amber: "text-amber-200",
  } as const;
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-zinc-950/60 p-5 shadow-panel">
      <div className={`pointer-events-none absolute inset-0 ${overlays[props.accent]}`} aria-hidden />
      <div className="relative flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/40 ring-1 ring-white/[0.04]">
          <Icon className={`h-6 w-6 ${iconHue[props.accent]}`} strokeWidth={1.35} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">{props.label}</p>
          <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-white">{props.value}</p>
          <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-zinc-500">{props.subtitle}</p>
        </div>
      </div>
    </div>
  );
}

/** Section card for secondary panels */
export function OpsPanelCard(props: {
  id?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}): ReactElement {
  return (
    <section
      id={props.id}
      className={`rounded-2xl border border-white/[0.06] bg-zinc-950/50 shadow-panel overflow-hidden ${props.className ?? ""}`}
    >
      <div className="border-b border-white/[0.06] px-4 py-3.5 bg-black/25">
        <h2 className="text-sm font-semibold text-white">{props.title}</h2>
        {props.subtitle ? (
          <p className="mt-1 text-[11px] text-zinc-500">{props.subtitle}</p>
        ) : null}
      </div>
      <div className="p-4">{props.children}</div>
    </section>
  );
}
