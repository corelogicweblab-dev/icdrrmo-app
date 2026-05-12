import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
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
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased bg-[#060608] text-zinc-100`}
      >
        <PwaRegister />
        <AppInstallStrip />
        <RouteLogoTransition />
        <div className="flex min-h-dvh flex-col">
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
          <footer className="shrink-0 border-t border-white/5 py-2.5 text-center text-[11px] tracking-wide text-zinc-500">
            Powered by: CoreLogic
          </footer>
        </div>
      </body>
    </html>
  );
}
