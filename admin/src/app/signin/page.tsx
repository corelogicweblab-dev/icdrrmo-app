import type { Metadata } from "next";
import type { ReactElement } from "react";
import { UnifiedLoginPage } from "@/components/unified-login-page";

export const metadata: Metadata = {
  title: "Sign in — ICDRRMO SMART Emergency Response",
  description: "Single sign-in — automatic routing to citizen, responder, chairman, or ops dashboard.",
};

export default function SignInPage(): ReactElement {
  return <UnifiedLoginPage />;
}
