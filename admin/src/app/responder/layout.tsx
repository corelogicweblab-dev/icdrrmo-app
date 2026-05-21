"use client";

import type { ReactElement, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, UserCircle } from "lucide-react";
import { IcdrrmoLogo } from "@/components/icdrrmo-logo";
import { ResponderSessionProvider, useResponderSession } from "@/components/responder/responder-session-context";
import { IcdrrmoAiChat } from "@/components/ai/icdrrmo-ai-chat";

function ResponderChrome({ children }: { children: ReactNode }): ReactElement {
  const { tokens, logout } = useResponderSession();
  const pathname = usePathname() ?? "/responder";

  return (
    <div className="min-h-screen bg-transparent text-zinc-100 flex flex-col">
      <header className="icd-header-bar px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg icd-logo-ring p-0.5">
            <IcdrrmoLogo size={32} className="rounded-md" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-white icd-text-safe">Responder console</span>
        </div>
        <nav className="flex items-center gap-2 text-xs">
          <Link
            href="/responder"
            className={pathname === "/responder" ? "icd-nav-link-active" : "icd-nav-link"}
          >
            Dashboard
          </Link>
          <Link
            href="/responder/map"
            className={pathname.startsWith("/responder/map") ? "icd-nav-link-active" : "icd-nav-link"}
          >
            Map
          </Link>
          <Link
            href="/responder/profile"
            className={`inline-flex items-center gap-1 ${
              pathname.startsWith("/responder/profile") ? "icd-nav-link-active" : "icd-nav-link"
            }`}
          >
            <UserCircle className="h-3.5 w-3.5" aria-hidden />
            Profile
          </Link>
          {tokens?.accessToken ? (
            <button
              type="button"
              onClick={() => logout()}
              className="inline-flex items-center gap-1 rounded-lg border border-orange-500/25 px-3 py-1.5 text-zinc-300 hover:bg-orange-500/10"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden />
              Out
            </button>
          ) : null}
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="shrink-0 border-t border-orange-500/15 px-4 py-3 text-center text-[10px] text-zinc-600">
        Isabela City DRRMO · <span className="text-orange-400/70">Powered by: CoreLogic</span>
      </footer>
      <IcdrrmoAiChat accessToken={tokens?.accessToken ?? null} portal="responder" />
    </div>
  );
}

export default function ResponderLayout({ children }: { children: ReactNode }): ReactElement {
  return (
    <ResponderSessionProvider>
      <ResponderChrome>{children}</ResponderChrome>
    </ResponderSessionProvider>
  );
}
