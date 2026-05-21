"use client";

import type { ReactElement } from "react";
import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Backpack,
  CheckCircle2,
  Circle,
  FileText,
  Heart,
  Loader2,
  Pill,
  Radio,
  Route,
  Users,
  Droplets,
} from "lucide-react";
import { getPrepareGuide } from "@/lib/preparedness-guides";
import { patchCitizenPreparedness } from "@/lib/citizen-feed";
import { getApiBaseUrl } from "@/lib/env";
import { CITIZEN_STORAGE_KEY } from "@/lib/unified-auth";

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

export function PrepareGuidePage(props: { params: Promise<{ topic: string }> }): ReactElement {
  const { topic } = use(props.params);
  const router = useRouter();
  const guide = getPrepareGuide(topic);
  const [lang, setLang] = useState<Lang>("tl");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CITIZEN_STORAGE_KEY);
      if (!raw) return;
      const p = JSON.parse(raw) as { accessToken?: string };
      if (!p.accessToken) return;
      setToken(p.accessToken);
      void fetch(`${getApiBaseUrl()}/citizen/preparedness`, {
        headers: { Authorization: `Bearer ${p.accessToken}` },
      })
        .then(async (r) => {
          if (!r.ok || !guide) return;
          const data = (await r.json()) as { checklist: Array<{ id: string; done: boolean }> };
          const row = data.checklist?.find((c) => c.id === guide.id);
          if (row) setDone(row.done);
        })
        .catch(() => {});
    } catch {
      /* ignore */
    }
  }, [guide]);

  const markDone = useCallback(
    async (nextDone: boolean) => {
      if (!token || !guide) return;
      setBusy(true);
      try {
        const res = await fetch(`${getApiBaseUrl()}/citizen/preparedness`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const current = res.ok
          ? ((await res.json()) as { checklist: Array<{ id: string; done: boolean }> })
          : { checklist: [] };
        const checklist = (current.checklist ?? []).map((c) =>
          c.id === guide.id ? { id: c.id, done: nextDone } : { id: c.id, done: c.done },
        );
        if (!checklist.some((c) => c.id === guide.id)) {
          checklist.push({ id: guide.id, done: nextDone });
        }
        await patchCitizenPreparedness(token, checklist);
        setDone(nextDone);
      } finally {
        setBusy(false);
      }
    },
    [token, guide],
  );

  if (!guide) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center text-sm text-zinc-400">
        <p>Hindi mahanap ang gabay na ito.</p>
        <Link href="/citizen" className="mt-4 inline-block text-orange-300 underline">
          Bumalik sa dashboard
        </Link>
      </div>
    );
  }

  const Icon = ICONS[guide.icon];
  const title = lang === "tl" ? guide.titleTl : guide.titleEn;
  const summary = lang === "tl" ? guide.summaryTl : guide.summaryEn;
  const steps = lang === "tl" ? guide.stepsTl : guide.stepsEn;
  const tips = lang === "tl" ? guide.tipsTl : guide.tipsEn;

  return (
    <div className="mx-auto max-w-lg min-h-[100dvh] px-4 py-6 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <header className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-200"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Bumalik
        </button>
        <div className="ml-auto flex gap-1 rounded-lg bg-black/40 p-0.5">
          <button
            type="button"
            onClick={() => setLang("tl")}
            className={`rounded-md px-2.5 py-1 text-[10px] font-semibold ${lang === "tl" ? "bg-orange-600/80 text-white" : "text-zinc-500"}`}
          >
            Filipino
          </button>
          <button
            type="button"
            onClick={() => setLang("en")}
            className={`rounded-md px-2.5 py-1 text-[10px] font-semibold ${lang === "en" ? "bg-orange-600/80 text-white" : "text-zinc-500"}`}
          >
            English
          </button>
        </div>
      </header>

      <div className="rounded-2xl border border-orange-500/25 bg-gradient-to-b from-orange-950/30 to-black/50 p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-600/25 ring-1 ring-orange-500/30">
            <Icon className="h-6 w-6 text-orange-300" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-orange-400/90">
              Gabay sa paghahanda
            </p>
            <h1 className="text-lg font-semibold text-white mt-0.5">{title}</h1>
            <p className="text-sm text-zinc-400 mt-2 leading-relaxed">{summary}</p>
          </div>
        </div>
      </div>

      <section className="mt-6 space-y-3">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
          {lang === "tl" ? "Mga hakbang" : "Steps"}
        </h2>
        <ol className="space-y-3">
          {steps.map((step, i) => (
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
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
          {lang === "tl" ? "Mga paalala" : "Tips"}
        </h2>
        <ul className="space-y-2">
          {tips.map((tip, i) => (
            <li
              key={i}
              className="rounded-lg border border-amber-500/15 bg-amber-950/20 px-3 py-2 text-xs text-amber-100/90"
            >
              {tip}
            </li>
          ))}
        </ul>
      </section>

      {token ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void markDone(!done)}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-rose-600 py-3.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : done ? (
            <CheckCircle2 className="h-4 w-4" aria-hidden />
          ) : (
            <Circle className="h-4 w-4" aria-hidden />
          )}
          {done
            ? lang === "tl"
              ? "Tapos na — i-uncheck kung hindi pa handa"
              : "Marked done — tap to uncheck"
            : lang === "tl"
              ? "Markahan bilang tapos na"
              : "Mark as completed"}
        </button>
      ) : (
        <p className="mt-8 text-center text-xs text-zinc-500">
          <Link href="/" className="text-orange-300 underline">
            Mag-sign in
          </Link>{" "}
          para i-save ang progress.
        </p>
      )}

      <Link
        href="/citizen"
        className="mt-4 block text-center text-xs text-zinc-500 hover:text-zinc-300"
      >
        ← SMART Citizen Dashboard
      </Link>
    </div>
  );
}
