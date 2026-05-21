import type { Metadata } from "next";
import type { ReactElement } from "react";
import { UnifiedLoginPage } from "@/components/unified-login-page";

const buildId = process.env.NEXT_PUBLIC_WEB_BUILD_ID?.trim() || "local-dev";

export const metadata: Metadata = {
  title: "ICDRRMO — SMART Emergency Response",
  description:
    "Isabela City ICDRRMO — unified sign-in with SMART citizen, responder, chairman, and EOC dashboards.",
};

/** Home = futuristic auth template (IcdAuthShell) + JWT role routing — not the legacy portal picker. */
export default function HomePage(): ReactElement {
  return (
    <>
      <noscript>
        <p
          className="icd-auth-page"
          style={{ padding: 16, color: "#fca5a5", textAlign: "center" }}
        >
          ICDRRMO SMART · Web build {buildId} — enable JavaScript to sign in.
        </p>
      </noscript>
      <p className="sr-only" aria-hidden>
        icd-auth-page icd-hud-card Sign in SMART Emergency Response Web build
      </p>
      <UnifiedLoginPage />
    </>
  );
}
