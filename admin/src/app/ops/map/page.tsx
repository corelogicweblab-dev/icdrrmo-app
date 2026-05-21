"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import { useOpsSession } from "@/components/ops/ops-session-context";
import { EocUnifiedMap } from "@/components/eoc/eoc-unified-map";
/** Full-screen EOC GIS — unified weather, incidents, responders, evacuation. */
export default function OpsMapPage(): ReactElement {
  const { tokens } = useOpsSession();

  if (!tokens?.accessToken) {
    return (
      <p className="p-6 text-sm text-zinc-500">
        Sign in to open the command map.{" "}
        <Link href="/" className="text-orange-400 underline">
          Login
        </Link>
      </p>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-52px)] min-h-[560px] -m-3 lg:-m-5">
      <EocUnifiedMap mode="ops" accessToken={tokens.accessToken} layout="fullscreen" className="flex-1" />
    </div>
  );
}
