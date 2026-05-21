import type { Metadata } from "next";
import type { ReactElement } from "react";
import { RoleGatewayHome } from "@/components/role-gateway-home";

const buildId = process.env.NEXT_PUBLIC_WEB_BUILD_ID?.trim() || "local-dev";

export const metadata: Metadata = {
  title: "ICDRRMO — SMART Emergency Response",
  description:
    "Isabela City ICDRRMO — SMART citizen dashboard, field responder, EOC operations, and ICDRRMO AI.",
};

/** Server-rendered build stamp so Firebase HTML always shows deploy version (CI verify + users). */
export default function HomePage(): ReactElement {
  return (
    <>
      <noscript>
        <p style={{ padding: 16, color: "#fca5a5", textAlign: "center" }}>
          ICDRRMO build {buildId} — enable JavaScript for SMART dashboards.
        </p>
      </noscript>
      <RoleGatewayHome />
    </>
  );
}
