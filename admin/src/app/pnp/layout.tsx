"use client";

import type { ReactElement, ReactNode } from "react";
import { AgencyChromeBridgeProvider } from "@/components/agency/agency-chrome-bridge";
import { AgencySessionProvider } from "@/components/agency/agency-session-context";
import { PNP_AGENCY_CONFIG } from "@/components/agency/agency-config";

export default function PnpLayout({ children }: { children: ReactNode }): ReactElement {
  return (
    <AgencyChromeBridgeProvider>
      <AgencySessionProvider config={PNP_AGENCY_CONFIG}>{children}</AgencySessionProvider>
    </AgencyChromeBridgeProvider>
  );
}
