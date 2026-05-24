"use client";

import type { ReactElement } from "react";
import { AgencyDeskPage } from "@/components/agency/agency-desk-page";
import { PNP_STORAGE_KEY } from "@/components/agency/agency-storage";

export default function PnpDashboardPage(): ReactElement {
  return (
    <AgencyDeskPage
      config={{
        role: "PNP",
        storageKey: PNP_STORAGE_KEY,
        title: "PNP Operations Desk",
        subtitle: "Philippine National Police — crime incidents forwarded by ICDRRMO EOC",
        accentClass: "bg-blue-800 hover:bg-blue-700 text-white",
      }}
    />
  );
}
