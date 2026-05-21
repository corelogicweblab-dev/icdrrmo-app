import type { Metadata } from "next";
import type { ReactElement } from "react";
import { RoleGatewayHome } from "@/components/role-gateway-home";

export const metadata: Metadata = {
  title: "Portals — ICDRRMO",
  description: "Optional role entry shortcuts (Citizen, Chairman, Responder, EOC).",
};

/** Optional shortcuts — primary entry is unified sign-in at `/`. */
export default function PortalsPage(): ReactElement {
  return <RoleGatewayHome />;
}
