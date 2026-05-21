import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ApiHealthStripGate } from "@/components/api-health-strip-gate";
import { AppFooterGate } from "@/components/app-footer-gate";
import { AppInstallStrip } from "@/components/app-install-strip";
import { PwaRegister } from "@/components/pwa-register";
import { RouteLogoTransition } from "@/components/route-logo-transition";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ICDRRMO SMART Emergency Response — Operation Center",
  description:
    "Isabela City Disaster Risk Reduction and Management Office — live incidents, SOS coordination, and hazard operations dashboard.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icdrrmologo.png", type: "image/png" }],
    apple: [{ url: "/icdrrmologo.png", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ICDRRMO Ops",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased min-h-dvh overflow-x-hidden text-zinc-100`}
      >
        <div className="icdrrmo-app-backdrop" aria-hidden>
          <div className="icd-scan-beam" />
        </div>
        <PwaRegister />
        <div className="icd-app-shell">
          <ApiHealthStripGate />
          <AppInstallStrip />
          <RouteLogoTransition />
          <div className="icd-app-main">{children}</div>
          <AppFooterGate />
        </div>
      </body>
    </html>
  );
}
