"use client";

import type { ReactElement } from "react";
import { showDevDiagnostics } from "@/lib/env";
import { ApiHealthStrip } from "@/components/api-health-strip";

/** Developer-only API probe — hidden on production enterprise console. */
export function ApiHealthStripGate(): ReactElement | null {
  if (!showDevDiagnostics()) return null;
  return <ApiHealthStrip />;
}
