"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Map, ShieldAlert } from "lucide-react";
import { useResponderSession, isResponderRole } from "@/components/responder/responder-session-context";

export default function ResponderHomePage(): ReactElement {
  const { tokens } = useResponderSession();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (!tokens?.accessToken) {
      setAllowed(null);
      return;
    }
    setAllowed(isResponderRole(tokens.accessToken));
  }, [tokens?.accessToken]);

  if (!tokens?.accessToken) {
    return (
      <div className="p-8 max-w-md mx-auto text-center space-y-4">
        <p className="text-sm text-zinc-400">Sign in on the responder portal to load your dashboard.</p>
        <Link
          href="/signin/responder"
          className="inline-block rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-500"
        >
          Go to responder sign-in
        </Link>
      </div>
    );
  }

  if (allowed === false) {
    return (
      <div className="p-8 flex flex-col items-center gap-4 text-center max-w-lg mx-auto">
        <ShieldAlert className="h-12 w-12 text-amber-400" aria-hidden />
        <p className="text-sm text-zinc-300">This area is for responder accounts. Your token role does not match.</p>
        <Link href="/signin/responder" className="text-xs text-sky-400 underline">
          Use a different account
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Field dashboard</h1>
        <p className="text-xs text-zinc-500 mt-1">Quick links for responders (map and profile are separate routes).</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/responder/profile"
          className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-sky-950/50 to-black/40 p-5 hover:border-sky-500/30 transition-colors"
        >
          <p className="text-sm font-medium text-white">Profile & medical</p>
          <p className="text-[11px] text-zinc-500 mt-2 leading-relaxed">Update availability, allergies, and contact info.</p>
        </Link>
        <Link
          href="/responder/map"
          className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-rose-950/40 to-black/40 p-5 hover:border-rose-500/30 transition-colors flex flex-col"
        >
          <Map className="h-6 w-6 text-rose-400 mb-2" aria-hidden />
          <p className="text-sm font-medium text-white">Live field map</p>
          <p className="text-[11px] text-zinc-500 mt-2 leading-relaxed">
            Barangay-scoped layers with route and ETA to the first plotted incident (OSRM).
          </p>
        </Link>
      </div>
    </div>
  );
}
