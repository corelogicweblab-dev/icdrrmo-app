"use client";

import type { ReactElement } from "react";
import { AgencyDeskPage } from "@/components/agency/agency-desk-page";
import { BFP_STORAGE_KEY } from "@/components/agency/agency-storage";

export default function BfpDashboardPage(): ReactElement {
  return (
    <AgencyDeskPage
      config={{
        role: "BFP",
        storageKey: BFP_STORAGE_KEY,
        title: "BFP Operations Desk",
        subtitle: "Bureau of Fire Protection — fire incidents forwarded by ICDRRMO EOC",
        accentClass: "bg-orange-700 hover:bg-orange-600 text-white",
      }}
    />
  );
}
