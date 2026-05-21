"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import { ArrowRight, Bot, Map, Radio, Shield, Smartphone, Sparkles } from "lucide-react";
import { IcdrrmoLogo } from "@/components/icdrrmo-logo";
import { WEB_BUILD_ID } from "@/lib/web-build-id";

const FEATURES = [
  { icon: Bot, label: "ICDRRMO AI", detail: "Multi-language assistant on every dashboard" },
  { icon: Map, label: "Windy + hazards", detail: "GDACS · PAGASA · live GeoJSON map" },
  { icon: Sparkles, label: "SMART Citizen", detail: "SOS lifecycle · evac · preparedness" },
] as const;

export function RoleGatewayHome(): ReactElement {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#040406] text-zinc-100">
      <div className="border-b border-emerald-500/30 bg-emerald-950/40 px-4 py-2 text-center">
        <p className="font-mono text-[11px] font-semibold text-emerald-200">
          LIVE BUILD {WEB_BUILD_ID} · SMART dashboards + ICDRRMO AI deployed
        </p>
      </div>

      <header className="border-b border-white/[0.06] bg-black/35 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl flex-col gap-6 px-5 py-8 text-center md:py-10">
          <div className="mx-auto flex h-[7.5rem] w-[7.5rem] items-center justify-center rounded-2xl bg-black/30 shadow-[0_20px_50px_-20px_rgba(225,29,72,0.45)] ring-1 ring-white/12 p-2">
            <IcdrrmoLogo size={120} priority className="h-full w-full max-h-[6.5rem] max-w-[6.5rem] object-contain" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-rose-300/95">
              Isabela City · Basilan
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white md:text-3xl">
              ICDRRMO SMART Emergency Response
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-zinc-400">
              Enterprise EOC — unified feed, predictive risk, realtime SOS, and{" "}
              <span className="text-orange-300">ICDRRMO AI</span> on Citizen, Chairman, Responder, and Ops consoles.
            </p>
          </div>
          <ul className="mx-auto flex max-w-2xl flex-wrap justify-center gap-2">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <li
                  key={f.label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/25 bg-black/40 px-3 py-1 text-[10px] text-zinc-300"
                >
                  <Icon className="h-3 w-3 text-orange-400" aria-hidden />
                  <span className="font-semibold text-orange-200/90">{f.label}</span>
                  <span className="text-zinc-500 hidden sm:inline">· {f.detail}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-5 py-8">
        <div className="text-center">
          <h2 className="text-xs font-bold uppercase tracking-[0.28em] text-zinc-500">
            Choose your entry point
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-[13px] text-zinc-500">
            Citizens: SMART dashboard with SOS + map + AI. Responders and operators use accredited accounts.
          </p>
          <Link
            href="/signin"
            className="mt-3 inline-block text-xs font-semibold text-orange-300 hover:text-orange-200 underline-offset-2 hover:underline"
          >
            Single sign-in (email + password) → auto-routes by role
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5" role="navigation" aria-label="Role portals">
          <GatewayCard
            href="/citizen"
            title="Citizen"
            tag="SMART · NEW"
            icon={Smartphone}
            description="SMART dashboard: SOS lifecycle, Windy map, evac centers, community feed, preparedness, ICDRRMO AI."
          />
          <GatewayCard
            href="/responder"
            title="Responder"
            tag="Field units"
            icon={Shield}
            description="Assignments, GPS routes, citizen medical on scene, field map, performance metrics, ICDRRMO AI."
          />
          <GatewayCard
            href="/ops"
            title="Operator / EOC"
            tag="Operations desk"
            icon={Radio}
            description="Command center, dispatch, analytics, audit, weather desk, ICDRRMO AI."
          />
        </div>

        <p className="text-center font-mono text-[10px] text-zinc-600">
          Build {WEB_BUILD_ID} · Hard refresh (Ctrl+Shift+R) if the page looks outdated
        </p>
      </main>
    </div>
  );
}

function GatewayCard(props: {
  href: string;
  title: string;
  tag: string;
  icon: typeof Smartphone;
  description: string;
}): ReactElement {
  const Icon = props.icon;
  return (
    <Link
      href={props.href}
      className="group relative flex min-h-[200px] flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-zinc-950/65 p-6 shadow-panel transition hover:border-rose-500/25 hover:bg-zinc-950/95"
      prefetch
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
          <Icon className="h-6 w-6 text-rose-200" strokeWidth={1.35} aria-hidden />
        </div>
        <ArrowRight
          className="h-5 w-5 text-zinc-600 transition group-hover:translate-x-0.5 group-hover:text-zinc-300"
          aria-hidden
        />
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-400/90">{props.tag}</p>
      <h2 className="mt-1 text-lg font-semibold text-white">{props.title}</h2>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-500">{props.description}</p>
    </Link>
  );
}
