"use client";

import type { ReactElement, ReactNode } from "react";
import { IcdrrmoLogo } from "@/components/icdrrmo-logo";

const ROLE_CHIPS = [
  { label: "Citizen", desc: "SOS · profile · alerts" },
  { label: "Responder", desc: "Field map · assignments" },
  { label: "Operations", desc: "EOC command console" },
  { label: "Chairman", desc: "Barangay first response" },
] as const;

type IcdAuthShellProps = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
};

/** Full-viewport futuristic auth layout — hero + HUD card (web home sign-in). */
export function IcdAuthShell(props: IcdAuthShellProps): ReactElement {
  return (
    <div className="icd-auth-page">
      <div className="icd-auth-grid-overlay" aria-hidden />

      <aside className="icd-auth-hero">
        <div className="icd-auth-hero-inner">
          <div className="icd-logo-pulse-wrap">
            <div className="icd-logo-pulse-ring" aria-hidden />
            <div className="icd-logo-pulse-core">
              <IcdrrmoLogo size={112} priority className="h-full w-full object-contain" />
            </div>
          </div>

          <p className="icd-eyebrow mt-8">Isabela City · Basilan</p>
          <h1 className="icd-auth-title icd-text-safe">
            ICDRRMO
            <span className="block text-orange-400/95">SMART Emergency Response</span>
          </h1>
          <p className="icd-auth-lead">
            Unified secure channel for disaster operations. One credential — automatic routing to your role
            dashboard after authentication.
          </p>

          <ul className="icd-auth-features">
            <li>
              <span className="icd-feature-dot" aria-hidden />
              Real-time SOS · SMS · mobile push
            </li>
            <li>
              <span className="icd-feature-dot" aria-hidden />
              GIS dispatch · evacuation · weather
            </li>
            <li>
              <span className="icd-feature-dot" aria-hidden />
              Audited access · RBAC enforced
            </li>
          </ul>

          <div className="icd-role-chip-row">
            {ROLE_CHIPS.map((chip) => (
              <span key={chip.label} className="icd-role-chip" title={chip.desc}>
                {chip.label}
              </span>
            ))}
          </div>

          <div className="icd-auth-status-bar">
            <span className="icd-live-dot inline-block h-2 w-2 rounded-full" aria-hidden />
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-orange-200/90">
              Secure channel · ICDRRMO v2
            </span>
          </div>
        </div>
      </aside>

      <main className="icd-auth-main">
        <div className="icd-hud-card w-full max-w-[440px]">
          {props.title ? (
            <div className="mb-6 border-b border-orange-500/15 pb-4">
              <h2 className="text-xl font-semibold text-white tracking-tight">{props.title}</h2>
              {props.subtitle ? <p className="mt-1.5 text-xs text-zinc-500">{props.subtitle}</p> : null}
            </div>
          ) : null}
          {props.children}
        </div>
        <p className="mt-6 text-center text-[10px] uppercase tracking-[0.22em] text-zinc-600">
          Authorized use only · audited access
        </p>
      </main>
    </div>
  );
}
