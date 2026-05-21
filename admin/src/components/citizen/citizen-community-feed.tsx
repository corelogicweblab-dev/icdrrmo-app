"use client";

import type { ReactElement } from "react";
import { Heart, Megaphone, Users } from "lucide-react";
import type { CitizenUnifiedFeed } from "@/lib/citizen-feed";

const CAT_ICON: Record<string, typeof Megaphone> = {
  BARANGAY: Megaphone,
  VOLUNTEER: Users,
  DONATION: Heart,
  ADVISORY: Megaphone,
};

export function CitizenCommunityFeed(props: {
  posts: CitizenUnifiedFeed["community"];
}): ReactElement {
  if (!props.posts.length) {
    return (
      <p className="text-xs text-zinc-500 py-4 text-center">
        Walang community post sa ngayon. Bumalik mamaya.
      </p>
    );
  }
  return (
    <ul className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
      {props.posts.map((p) => {
        const Icon = CAT_ICON[p.category] ?? Megaphone;
        return (
          <li
            key={p.id}
            className={`rounded-xl border p-3 text-xs ${
              p.isPinned
                ? "border-orange-500/35 bg-orange-950/25"
                : "border-white/[0.06] bg-black/25"
            }`}
          >
            <div className="flex items-start gap-2">
              <Icon className="h-4 w-4 shrink-0 text-orange-400 mt-0.5" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-zinc-100">{p.title}</p>
                <p className="mt-1 text-zinc-400 leading-relaxed">{p.body}</p>
                <p className="mt-2 text-[10px] text-zinc-600">
                  {p.barangayName} · {p.category}
                  {p.locale === "tl" ? " · TL" : ""}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
