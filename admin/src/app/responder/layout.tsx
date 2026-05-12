"use client";

import type { ReactElement, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, UserCircle } from "lucide-react";
import { IcdrrmoLogo } from "@/components/icdrrmo-logo";
import { ResponderSessionProvider, useResponderSession } from "@/components/responder/responder-session-context";

function ResponderChrome({ children }: { children: ReactNode }): ReactElement {
  const { tokens, logout } = useResponderSession();
  const pathname = usePathname() ?? "/responder";

  return (
    <div className="min-h-screen bg-transparent text-zinc-100 flex flex-col">
      <header className="shrink-0 border-b border-white/[0.06] bg-black/50 backdrop-blur-md px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg ring-1 ring-white/10 bg-black/40 p-0.5">
            <IcdrrmoLogo size={32} className="rounded-md" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Responder console</span>
        </div>
        <nav className="flex items-center gap-2 text-xs">
          <Link
            href="/responder"
            className={`rounded-lg px-3 py-1.5 ${pathname === "/responder" ? "bg-sky-600/80 text-white" : "text-zinc-400 hover:bg-white/5"}`}
          >
            Dashboard
          </Link>
          <Link
            href="/responder/map"
            className={`rounded-lg px-3 py-1.5 ${
              pathname.startsWith("/responder/map") ? "bg-sky-600/80 text-white" : "text-zinc-400 hover:bg-white/5"
            }`}
          >
            Map
          </Link>
          <Link
            href="/responder/profile"
            className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 ${
              pathname.startsWith("/responder/profile") ? "bg-sky-600/80 text-white" : "text-zinc-400 hover:bg-white/5"
            }`}
          >
            <UserCircle className="h-3.5 w-3.5" aria-hidden />
            Profile
          </Link>
          {tokens?.accessToken ? (
            <button
              type="button"
              onClick={() => logout()}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-zinc-300 hover:bg-white/5"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden />
              Out
            </button>
          ) : null}
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="shrink-0 border-t border-white/[0.06] px-4 py-3 text-center text-[10px] text-zinc-600">
        Isabela City DRRMO · <span className="text-zinc-500">Powered by: CoreLogic</span>
      </footer>
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
