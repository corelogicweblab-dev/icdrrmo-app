"use client";

import { OpsSessionProvider } from "@/components/ops/ops-session-context";
import { OpsShellGate } from "@/components/ops/ops-shell-gate";

export default function OpsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <OpsSessionProvider>
      <OpsShellGate>{children}</OpsShellGate>
    </OpsSessionProvider>
  );
}
