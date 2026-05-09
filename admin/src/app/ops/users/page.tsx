"use client";

import type { ReactElement } from "react";
import { Fingerprint, Key, ShieldEllipsis, UserSearch } from "lucide-react";
import { OpsPanelCard } from "@/components/ops/ops-widgets";

const RBAC_MATRIX = [
  "Super Admin",
  "Operations Admin",
  "Dispatcher",
  "Responder",
  "Analyst",
  "Barangay Coordinator",
] as const;

const PRISMA_ROLES = ["SUPER_ADMIN", "ADMIN", "OPERATOR", "RESPONDER", "CITIZEN"] as const;

export default function OpsUsersPage(): ReactElement {
  return (
    <div className="p-4 lg:p-6 grid gap-4 lg:grid-cols-12">
      <OpsPanelCard title="User & access management" subtitle="RBAC · permissions · verification" className="lg:col-span-7">
        <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
          Target personas map to granular policies. Backend currently exposes Prisma enums — extend with permission keys on next auth pass.
        </p>
        <div className="flex flex-wrap gap-2 mb-6">
          {RBAC_MATRIX.map((r) => (
            <span key={r} className="rounded-lg border border-rose-500/25 bg-rose-950/20 px-3 py-1 text-[11px] text-rose-100">
              {r}
            </span>
          ))}
        </div>
        <ul className="space-y-2 text-xs text-zinc-400 mb-8">
          <li className="flex gap-2">
            <Key className="h-4 w-4 text-amber-400 shrink-0" aria-hidden /> Fine-grained module toggles per seat
          </li>
          <li className="flex gap-2">
            <UserSearch className="h-4 w-4 text-sky-400 shrink-0" aria-hidden /> Device sessions + revoke
          </li>
          <li className="flex gap-2">
            <Fingerprint className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden /> Login history + anomaly scoring
          </li>
          <li className="flex gap-2">
            <ShieldEllipsis className="h-4 w-4 text-zinc-500 shrink-0" aria-hidden /> ID verification workflow
          </li>
        </ul>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-2">Prisma baseline roles</p>
          <div className="flex flex-wrap gap-2 font-mono text-[11px] text-zinc-500">
            {PRISMA_ROLES.map((p) => (
              <span key={p}>{p}</span>
            ))}
          </div>
        </div>
      </OpsPanelCard>
      <OpsPanelCard title="Directory (stub)" className="lg:col-span-5">
        <p className="text-sm text-zinc-500">
          Wire `GET /users` admin listing +invite flows — grid placeholder suppressed until guarded APIs exist.
        </p>
      </OpsPanelCard>
    </div>
  );
}
