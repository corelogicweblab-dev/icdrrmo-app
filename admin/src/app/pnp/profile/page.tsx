"use client";

import type { ReactElement } from "react";
import { Shield } from "lucide-react";
import { useAgencySession } from "@/components/agency/agency-session-context";
import { BarangayUserProfileCard } from "@/components/barangay-user-profile-card";
import { OpsPanelCard } from "@/components/ops/ops-widgets";

export default function PnpProfilePage(): ReactElement {
  const { config, tokens } = useAgencySession();

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white tracking-tight">My profile</h2>
          <p className="text-xs text-zinc-500 mt-1">
            Contact and barangay scope for {config.portalTitle}.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-orange-500/20 bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-wide text-zinc-400">
          <Shield className="h-3.5 w-3.5 text-rose-400" aria-hidden />
          PNP
        </span>
      </div>
      <BarangayUserProfileCard accessToken={tokens.accessToken} />
      <OpsPanelCard title="Desk access" subtitle="Shared ICDRRMO agency console">
        <p className="text-sm text-zinc-400">
          Incident queue and map sync from the EOC when cases are forwarded to PNP. Use{" "}
          <strong className="text-zinc-200">Agency desk</strong> in the sidebar for live operations.
        </p>
      </OpsPanelCard>
    </div>
  );
}
