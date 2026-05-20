"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import { useResponderSession, isResponderRole } from "@/components/responder/responder-session-context";
import { EocUnifiedMap } from "@/components/eoc/eoc-unified-map";

export default function ResponderMapPage(): ReactElement {
  const { tokens } = useResponderSession();
  const access = tokens?.accessToken;
  const ok = access ? isResponderRole(access) : false;

  if (!access) {
    return (
      <div className="p-8 text-center text-sm text-zinc-400">
        <Link href="/" className="text-orange-400 underline">
          Sign in
        </Link>{" "}
        to open the field map.
      </div>
    );
  }

  if (!ok) {
    return <p className="p-8 text-sm text-amber-200/90">Responder role required for this map.</p>;
  }

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <h1 className="text-sm font-semibold text-white mb-3">Responder EOC map</h1>
      <EocUnifiedMap mode="responder" accessToken={access} />
    </div>
  );
}
