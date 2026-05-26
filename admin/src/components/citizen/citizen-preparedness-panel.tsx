"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import {
  Backpack,
  ChevronRight,
  FileText,
  Heart,
  Pill,
  Radio,
  Route,
  Users,
  Droplets,
} from "lucide-react";
import { PREPARE_GUIDES } from "@/lib/preparedness-guides";

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

export function CitizenPreparednessPanel(): ReactElement {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-orange-400/90">
          Emergency preparedness guides
        </p>
        <p className="mt-2 text-[11px] text-zinc-500 leading-relaxed">
          Tap any card for step-by-step guidance. These guides are always available — no checklist to
          finish.
        </p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {PREPARE_GUIDES.map((guide) => {
          const Icon = ICONS[guide.icon];
          return (
            <li key={guide.id}>
              <Link
                href={`/citizen/prepare/${guide.id}`}
                className="group flex flex-col rounded-xl border border-white/[0.08] bg-black/30 px-4 py-3.5 transition hover:border-orange-500/35 hover:bg-orange-950/20"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-600/15 ring-1 ring-orange-500/25">
                    <Icon className="h-5 w-5 text-orange-300" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-snug text-zinc-100">{guide.titleEn}</p>
                    <p className="mt-1 line-clamp-2 text-[11px] text-zinc-500 leading-snug">
                      {guide.summaryEn}
                    </p>
                    <p className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-orange-300/90 group-hover:text-orange-200">
                      Read guide
                      <ChevronRight className="h-3 w-3" aria-hidden />
                    </p>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
