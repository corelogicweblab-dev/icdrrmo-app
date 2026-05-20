"use client";

import type { ReactElement } from "react";
import { IcdrrmoLogo } from "@/components/icdrrmo-logo";

type OpsLoginProps = {
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  loginError: string | null;
  /** Optional connectivity / configuration notice (generic unless dev diagnostics build). */
  apiConfigWarning: string | null;
  onSubmit: (e: React.FormEvent) => void;
};

export function OpsLoginView(props: OpsLoginProps): ReactElement {
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
              <p className="icd-eyebrow">Isabela City</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white icd-text-safe">
                ICDRRMO Operation Center
              </h1>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-400">
                Full command suite: dashboard, incidents, GIS, dispatch, responders, weather, SMS,
                voice, audit, and system health — secured for authorized LGU personnel.
              </p>
            </div>
          </div>
          <ul className="grid gap-4 text-sm text-zinc-500 max-w-md">
            <li className="flex gap-3">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500 icd-live-dot" aria-hidden />
              Eighteen operational modules · single tactical console.
            </li>
            <li className="flex gap-3">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" aria-hidden />
              Realtime incident feed · REST-backed queue · PWA installable.
            </li>
            <li className="flex gap-3">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-600" aria-hidden />
              RBAC: Super Admin, Operations, Dispatcher, Responder, Analyst, Barangay roles.
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
            <h2 className="text-xl font-semibold tracking-tight text-white">Secure sign-in</h2>
            <p className="mt-2 text-sm text-zinc-500">
              ICDRRMO SMART Emergency Response — authenticated session required.
            </p>
          </div>
          {props.apiConfigWarning ? (
            <div
              className="mb-6 rounded-xl border border-amber-500/30 bg-amber-950/40 px-4 py-3 text-sm text-amber-50"
              role="status"
            >
              {props.apiConfigWarning}
            </div>
          ) : null}
          {props.loginError ? (
            <div
              className="mb-6 rounded-xl border border-rose-500/25 bg-rose-950/35 px-4 py-3 text-sm text-rose-100"
              role="alert"
            >
              {props.loginError}
            </div>
          ) : null}
          <form onSubmit={props.onSubmit} className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                Email
              </span>
              <input
                className="icd-input"
                value={props.email}
                onChange={(ev) => props.setEmail(ev.target.value)}
                autoComplete="username"
                placeholder="operations@agency.gov"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                Password
              </span>
              <input
                type="password"
                className="icd-input"
                value={props.password}
                onChange={(ev) => props.setPassword(ev.target.value)}
                autoComplete="current-password"
              />
            </label>
            <button type="submit" className="icd-btn-primary py-3.5">
              Enter command console
            </button>
          </form>
          <p className="mt-8 text-center text-[11px] leading-relaxed text-zinc-600">
            Access is issued by ICDRRMO. Unauthorized use is prohibited and may be subject to audit.
          </p>
        </div>
      </div>
    </div>
  );
}
