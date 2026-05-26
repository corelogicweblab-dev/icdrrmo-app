"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import { Flame } from "lucide-react";
import { useAgencySession } from "@/components/agency/agency-session-context";
import { BarangayUserProfileCard } from "@/components/barangay-user-profile-card";
import { OpsPanelCard } from "@/components/ops/ops-widgets";

export default function BfpProfilePage(): ReactElement {
  const { config, tokens } = useAgencySession();

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white tracking-tight">My profile</h2>
          <p className="text-xs text-zinc-500 mt-1">
            Agency account for {config.portalTitle} — not tied to one barangay.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-orange-500/20 bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-wide text-zinc-400">
          <Flame className="h-3.5 w-3.5 text-orange-400" aria-hidden />
          BFP
        </span>
      </div>
      <BarangayUserProfileCard accessToken={tokens.accessToken} agencyDesk />
      <OpsPanelCard title="Desk access" subtitle="Shared ICDRRMO agency console">
        <p className="text-sm text-zinc-400">
          Use{" "}
          <Link href={config.basePath} className="text-orange-300 hover:text-orange-200 underline font-medium">
            Agency desk
          </Link>{" "}
          in the sidebar for the live incident queue and map. Saving profile here stays on this page.
        </p>
      </OpsPanelCard>
    </div>
  );
}
