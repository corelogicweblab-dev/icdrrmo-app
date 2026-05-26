"use client";

import type { ReactElement } from "react";
import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Backpack,
  FileText,
  Heart,
  Pill,
  Radio,
  Route,
  Users,
  Droplets,
} from "lucide-react";
import { getPrepareGuide } from "@/lib/preparedness-guides";

const ICONS = {
  bag: Backpack,
  users: Users,
  route: Route,
  heart: Heart,
  file: FileText,
  water: Droplets,
  pill: Pill,
  radio: Radio,
} as const;

export function PrepareGuidePage(props: { params: Promise<{ topic: string }> }): ReactElement {
  const { topic } = use(props.params);
  const router = useRouter();
  const guide = getPrepareGuide(topic);

  if (!guide) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center text-sm text-zinc-400">
        <p>Guide not found.</p>
        <Link href="/citizen" className="mt-4 inline-block text-orange-300 underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const Icon = ICONS[guide.icon];

  return (
    <div className="mx-auto max-w-lg min-h-[100dvh] px-4 py-6 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <header className="mb-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-200"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back
        </button>
      </header>

      <div className="rounded-2xl border border-orange-500/25 bg-gradient-to-b from-orange-950/30 to-black/50 p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-600/25 ring-1 ring-orange-500/30">
            <Icon className="h-6 w-6 text-orange-300" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-orange-400/90">
              Preparedness guide
            </p>
            <h1 className="text-lg font-semibold text-white mt-0.5">{guide.titleEn}</h1>
            <p className="text-sm text-zinc-400 mt-2 leading-relaxed">{guide.summaryEn}</p>
          </div>
        </div>
      </div>

      <section className="mt-6 space-y-3">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Steps</h2>
        <ol className="space-y-3">
          {guide.stepsEn.map((step, i) => (
            <li
              key={i}
              className="flex gap-3 rounded-xl border border-white/[0.06] bg-black/25 px-4 py-3 text-sm text-zinc-200"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-600/30 text-[11px] font-bold text-orange-100">
                {i + 1}
              </span>
              <span className="leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-6 space-y-2">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Tips</h2>
        <ul className="space-y-2">
          {guide.tipsEn.map((tip, i) => (
            <li
              key={i}
              className="rounded-lg border border-amber-500/15 bg-amber-950/20 px-3 py-2 text-xs text-amber-100/90"
            >
              {tip}
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-8 text-center text-xs text-zinc-500 leading-relaxed">
        This guide stays available anytime. Review steps before typhoons and after drills.
      </p>

      <Link
        href="/citizen"
        className="mt-4 block text-center text-xs text-zinc-500 hover:text-zinc-300"
      >
        ← SMART Citizen Dashboard
      </Link>
    </div>
  );
}
