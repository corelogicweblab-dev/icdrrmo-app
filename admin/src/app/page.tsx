import type { Metadata } from "next";
import type { ReactElement } from "react";
import { UnifiedLoginPage } from "@/components/unified-login-page";

export const metadata: Metadata = {
  title: "Sign in — ICDRRMO SMART Emergency Response",
  description:
    "Single sign-in for Isabela City ICDRRMO — citizen, responder, and operations accounts.",
};

export default function HomePage(): ReactElement {
  return <UnifiedLoginPage />;
}
