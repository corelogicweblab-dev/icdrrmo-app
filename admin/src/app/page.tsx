import type { Metadata } from "next";
import type { ReactElement } from "react";
import Link from "next/link";
import { ArrowRight, Radio, Smartphone, Shield } from "lucide-react";

export const metadata: Metadata = {
  title: "ICDRRMO — SMART Emergency Response",
  description:
    "Isabela City ICDRRMO — citizen emergency access and accredited operations consoles.",
};

export default function GatewayPage(): ReactElement {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#040406] text-zinc-100">
      <header className="border-b border-white/[0.06] bg-black/35 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl flex-col gap-6 px-5 py-10 text-center md:py-14">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-600 to-rose-800 shadow-[0_20px_50px_-20px_rgba(225,29,72,0.7)] ring-1 ring-white/15">
            <Shield className="h-9 w-9 text-white" strokeWidth={1.25} aria-hidden />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-rose-300/95">
              Isabela City · Basilan
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white md:text-3xl">
              ICDRRMO SMART Emergency Response
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-zinc-400">
              Field-grade web apps for citizens and responders. Install to your phone: open in Chrome
              or Safari →{" "}
              <span className="text-zinc-300">
                Share / Add to Home screen
              </span>
              .
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-5 py-10">
        <div className="grid gap-4 md:grid-cols-2">
          <GatewayCard
            href="/citizen"
            title="Citizen emergency"
            icon={Smartphone}
            description="Self-service account, SOS with GPS capture, encrypted session. For residents and responders off-post."
          />
          <GatewayCard
            href="/ops"
            title="Operation Center"
            icon={Radio}
            description="Privileged console for ICDRRMO — live queue, map, realtime ops channel."
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
  icon: typeof Smartphone;
  description: string;
}): ReactElement {
  const Icon = props.icon;
  return (
    <Link
      href={props.href}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-zinc-950/65 p-6 shadow-panel transition hover:border-rose-500/25 hover:bg-zinc-950/95"
      prefetch
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
          <Icon className="h-6 w-6 text-rose-200" strokeWidth={1.35} aria-hidden />
        </div>
        <ArrowRight
          className="h-5 w-5 text-zinc-600 transition group-hover:translate-x-0.5 group-hover:text-zinc-300"
          aria-hidden
        />
      </div>
      <h2 className="text-lg font-semibold text-white">{props.title}</h2>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-500">{props.description}</p>
    </Link>
  );
}
