"use client";

import type { ReactElement } from "react";
import { useState } from "react";
import Link from "next/link";
import {
  Award,
  Backpack,
  CheckCircle2,
  ChevronRight,
  FileText,
  Heart,
  Loader2,
  Pill,
  Radio,
  Route,
  Users,
  Droplets,
} from "lucide-react";
import { patchCitizenPreparedness } from "@/lib/citizen-feed";
import { PREPARE_GUIDES, type PrepareGuide } from "@/lib/preparedness-guides";

type CheckItem = {
  id: string;
  label: string;
  labelTl: string;
  done: boolean;
};

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

type Lang = "tl" | "en";

export function CitizenPreparednessPanel(props: {
  accessToken: string;
  checklist: CheckItem[];
  badges: string[];
  onUpdated: () => void;
}): ReactElement {
  const [busy, setBusy] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>("tl");

  async function toggle(id: string, done: boolean, ev: React.MouseEvent): Promise<void> {
    ev.preventDefault();
    ev.stopPropagation();
    setBusy(id);
    try {
      const next = props.checklist.map((c) =>
        c.id === id ? { id, done: !done } : { id: c.id, done: c.done },
      );
      await patchCitizenPreparedness(props.accessToken, next);
      props.onUpdated();
    } finally {
      setBusy(null);
    }
  }

  const doneCount = props.checklist.filter((c) => c.done).length;
  const guideById = new Map<string, PrepareGuide>(PREPARE_GUIDES.map((g) => [g.id, g]));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-orange-400/90">
          {lang === "tl" ? "Emergency kit" : "Emergency kit"} · {doneCount}/{props.checklist.length}
        </p>
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5 rounded-lg bg-black/40 p-0.5">
            <button
              type="button"
              onClick={() => setLang("tl")}
              className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${lang === "tl" ? "bg-orange-600/80 text-white" : "text-zinc-500"}`}
            >
              Filipino
            </button>
            <button
              type="button"
              onClick={() => setLang("en")}
              className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${lang === "en" ? "bg-orange-600/80 text-white" : "text-zinc-500"}`}
            >
              English
            </button>
          </div>
          {props.badges.length > 0 ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-amber-300/90">
              <Award className="h-3.5 w-3.5" aria-hidden />
              {props.badges.join(", ")}
            </span>
          ) : null}
        </div>
      </div>

      <p className="text-[11px] text-zinc-500 leading-relaxed">
        {lang === "tl"
          ? "I-tap ang card para basahin ang buong gabay. I-check kapag tapos na ang hakbang."
          : "Tap a card for the full guide. Check off when you have completed the step."}
      </p>

      <ul className="grid gap-3 sm:grid-cols-2">
        {props.checklist.map((item) => {
          const meta = guideById.get(item.id);
          const Icon = meta ? ICONS[meta.icon] : Backpack;
          const title = lang === "tl" ? item.labelTl : item.label;
          const subtitle = lang === "tl" ? item.label : item.labelTl;
          return (
            <li key={item.id}>
              <Link
                href={`/citizen/prepare/${item.id}`}
                className={`group flex flex-col rounded-xl border px-4 py-3.5 transition hover:border-orange-500/35 hover:bg-orange-950/20 ${
                  item.done
                    ? "border-emerald-500/25 bg-emerald-950/15"
                    : "border-white/[0.08] bg-black/30"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1 ${
                      item.done
                        ? "bg-emerald-600/20 ring-emerald-500/30"
                        : "bg-orange-600/15 ring-orange-500/25"
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 ${item.done ? "text-emerald-300" : "text-orange-300"}`}
                      aria-hidden
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-semibold leading-snug ${item.done ? "text-zinc-500 line-through" : "text-zinc-100"}`}
                    >
                      {title}
                    </p>
                    <p className="mt-0.5 text-[10px] text-zinc-600">{subtitle}</p>
                    <p className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-orange-300/90 group-hover:text-orange-200">
                      {lang === "tl" ? "Basahin ang gabay" : "Read guide"}
                      <ChevronRight className="h-3 w-3" aria-hidden />
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={item.done ? "Mark incomplete" : "Mark complete"}
                    disabled={busy === item.id}
                    onClick={(ev) => void toggle(item.id, item.done, ev)}
                    className="shrink-0 rounded-lg p-1.5 text-zinc-500 hover:bg-white/10 hover:text-emerald-300"
                  >
                    {busy === item.id ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : item.done ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <span className="block h-5 w-5 rounded-full border-2 border-zinc-600" />
                    )}
                  </button>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
