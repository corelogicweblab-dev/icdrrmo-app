"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import { IcdrrmoLogo } from "@/components/icdrrmo-logo";
import type { AgencyPortalConfig } from "@/components/agency/agency-config";

type AgencyLoginViewProps = {
  config: AgencyPortalConfig;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  loginError: string | null;
  loginBusy: boolean;
  onSubmit: (e: React.FormEvent) => void;
};

export function AgencyLoginView(props: AgencyLoginViewProps): ReactElement {
  const { config } = props;
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-transparent">
      <div className="relative hidden lg:flex lg:w-[46%] flex-col justify-between overflow-hidden px-11 py-12 icd-login-hero">
        <div className="absolute inset-0 ops-grid-bg opacity-35 mix-blend-overlay" aria-hidden />
        <div className="relative z-10 flex flex-col gap-10">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center icd-logo-ring p-1">
              <IcdrrmoLogo size={56} priority className="rounded-xl" />
            </div>
            <div>
              <p className="icd-eyebrow">ICDRRMO · Agency partner</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white icd-text-safe">
                {config.loginHeroTitle}
              </h1>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-400">{config.loginHeroLead}</p>
            </div>
          </div>
          <ul className="grid gap-4 text-sm text-zinc-500 max-w-md">
            <li className="flex gap-3">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500 icd-live-dot" aria-hidden />
              Shared ops UI: sidebar, live sync badge, map, and profile.
            </li>
            <li className="flex gap-3">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" aria-hidden />
              Realtime queue when EOC forwards {config.role === "PNP" ? "crime" : "fire"} incidents.
            </li>
            <li className="flex gap-3">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-600" aria-hidden />
              {config.role} accounts only — use credentials issued by ICDRRMO ICT.
            </li>
          </ul>
        </div>
        <p className="relative z-10 text-[11px] text-zinc-600 uppercase tracking-wide">
          Restricted system · Access audited
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-[420px] icd-surface p-9 shadow-panel">
          <div className="mb-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-rose-300/90">{config.role} desk</p>
            <h2 className="mt-2 text-xl font-semibold text-white tracking-tight">{config.portalTitle}</h2>
            <p className="mt-1.5 text-xs text-zinc-500">{config.portalSubtitle}</p>
          </div>
          <form onSubmit={props.onSubmit} className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Email</span>
              <input
                type="email"
                required
                autoComplete="username"
                value={props.email}
                onChange={(e) => props.setEmail(e.target.value)}
                className="w-full rounded-lg border border-orange-500/20 bg-black/40 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-rose-500/40"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Password</span>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={props.password}
                onChange={(e) => props.setPassword(e.target.value)}
                className="w-full rounded-lg border border-orange-500/20 bg-black/40 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-rose-500/40"
              />
            </label>
            {props.loginError ? <p className="text-xs text-rose-300">{props.loginError}</p> : null}
            <button
              type="submit"
              disabled={props.loginBusy}
              className="w-full rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-40"
            >
              {props.loginBusy ? "Signing in…" : "Sign in"}
            </button>
          </form>
          <Link href="/" className="mt-6 block text-center text-xs text-zinc-500 hover:text-zinc-300">
            ← Unified sign-in
          </Link>
        </div>
      </div>
    </div>
  );
}
