"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BarangayUserProfileCard } from "@/components/barangay-user-profile-card";

export type StaffProfilePageProps = {
  accessToken: string | undefined;
  backHref: string;
  backLabel: string;
  portalLabel: string;
  signInHint: string;
  requireBarangay?: boolean;
};

export function StaffProfilePage({
  accessToken,
  backHref,
  backLabel,
  portalLabel,
  signInHint,
  requireBarangay,
}: StaffProfilePageProps): ReactElement {
  if (!accessToken) {
    return (
      <div className="min-h-[50vh] p-8 text-center text-sm text-zinc-500">
        <p>{signInHint}</p>
        <Link href={backHref} className="mt-4 inline-block text-rose-400 underline">
          {backLabel}
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-4">
      <header className="flex items-center justify-between gap-3">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          {backLabel}
        </Link>
        <span className="text-[10px] font-bold uppercase tracking-widest text-rose-300/90">{portalLabel}</span>
      </header>
      <BarangayUserProfileCard accessToken={accessToken} requireBarangay={requireBarangay} />
    </div>
  );
}
