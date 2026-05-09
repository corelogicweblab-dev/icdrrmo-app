"use client";

import { OpsSessionProvider } from "@/components/ops/ops-session-context";

export default function OpsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <OpsSessionProvider>{children}</OpsSessionProvider>;
}
