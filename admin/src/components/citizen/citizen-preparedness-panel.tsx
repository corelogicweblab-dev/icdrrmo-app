"use client";

import type { ReactElement } from "react";
import { useState } from "react";
import { Award, Loader2 } from "lucide-react";
import { patchCitizenPreparedness } from "@/lib/citizen-feed";

type CheckItem = {
  id: string;
  label: string;
  labelTl: string;
  done: boolean;
};

export function CitizenPreparednessPanel(props: {
  accessToken: string;
  checklist: CheckItem[];
  badges: string[];
  onUpdated: () => void;
}): ReactElement {
  const [busy, setBusy] = useState<string | null>(null);

  async function toggle(id: string, done: boolean): Promise<void> {
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-orange-400/90">
          Emergency kit · {doneCount}/{props.checklist.length}
        </p>
        {props.badges.length > 0 ? (
          <span className="inline-flex items-center gap-1 text-[10px] text-amber-300/90">
            <Award className="h-3.5 w-3.5" aria-hidden />
            {props.badges.join(", ")}
          </span>
        ) : null}
      </div>
      <ul className="space-y-2">
        {props.checklist.map((item) => (
          <li key={item.id}>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2.5 hover:bg-black/35">
              <input
                type="checkbox"
                checked={item.done}
                disabled={busy === item.id}
                onChange={() => void toggle(item.id, item.done)}
                className="mt-0.5 h-4 w-4 rounded border-zinc-600"
              />
              <span className="min-w-0 flex-1 text-xs">
                <span className={item.done ? "text-zinc-500 line-through" : "text-zinc-200"}>
                  {item.label}
                </span>
                <span className="block text-[10px] text-zinc-600">{item.labelTl}</span>
              </span>
              {busy === item.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-500" />
              ) : null}
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
