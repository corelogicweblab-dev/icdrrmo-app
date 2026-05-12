import type { Metadata } from "next";
import type { ReactElement } from "react";
import Link from "next/link";
import { ArrowRight, Radio, Shield, Smartphone } from "lucide-react";
import { IcdrrmoLogo } from "@/components/icdrrmo-logo";

export const metadata: Metadata = {
  title: "ICDRRMO — SMART Emergency Response",
  description:
    "Isabela City ICDRRMO — citizen emergency access and accredited operations consoles.",
};

export default function GatewayPage(): ReactElement {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-transparent text-zinc-100">
      <header className="border-b border-white/[0.06] bg-black/35 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl flex-col gap-6 px-5 py-10 text-center md:py-14">
          <div className="mx-auto flex h-[7.5rem] w-[7.5rem] items-center justify-center rounded-2xl bg-black/30 shadow-[0_20px_50px_-20px_rgba(225,29,72,0.45)] ring-1 ring-white/12 p-2 md:h-36 md:w-36 md:p-3">
            <IcdrrmoLogo
              size={120}
              priority
              className="h-full w-full max-h-[6.5rem] max-w-[6.5rem] object-contain drop-shadow-[0_4px_20px_rgba(225,29,72,0.35)] md:max-h-[7.5rem] md:max-w-[7.5rem]"
            />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-rose-300/95">
              Isabela City · Basilan
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white md:text-3xl">
              ICDRRMO SMART Emergency Response
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-zinc-400">
              Three separate portals — <span className="text-zinc-200">Citizen</span>,{" "}
              <span className="text-zinc-200">Responder</span>, and{" "}
              <span className="text-zinc-200">Operator / EOC</span>. Use the card that matches your role. PWA: open in
              Chrome or Safari, then <span className="text-zinc-300">Share → Add to Home screen</span>.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-5 py-10">
        <div className="text-center">
          <h2 className="text-xs font-bold uppercase tracking-[0.28em] text-zinc-500">Choose your entry point</h2>
          <p className="mx-auto mt-2 max-w-2xl text-[13px] text-zinc-500">
            Citizens use the first card (account + SOS). Responders and operators each have their own sign-in — do not
            use the citizen portal for desk or field roles.
          </p>
        </div>

        {/* Always three columns from `md` up so all roles stay visible on a laptop; stacked on phones. */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5" role="navigation" aria-label="Role portals">
          <GatewayCard
            href="/citizen"
            title="Citizen"
            tag="Residents & public"
            icon={Smartphone}
            description="Create an account, complete profile (barangay, street), capture GPS, and send SOS. Not for dispatch staff."
          />
          <GatewayCard
            href="/signin/responder"
            title="Responder"
            tag="Field units"
            icon={Shield}
            description="Responder sign-in — assignments, map, and profile. Requires a responder account from ICDRRMO."
          />
          <GatewayCard
            href="/signin/operator"
            title="Operator / EOC"
            tag="Operations desk"
            icon={Radio}
            description="Privileged operations console — live queue, situation map, assignments, audit (admin / operator)."
          />
        </div>

        <p className="text-center text-[11px] uppercase tracking-[0.2em] text-zinc-600">
          Authorized use only · audited access
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
      className="group relative flex min-h-[200px] flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-zinc-950/65 p-6 shadow-panel transition hover:border-rose-500/25 hover:bg-zinc-950/95 md:min-h-[220px]"
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
