"use client";

import type { ReactElement, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, LayoutDashboard, LogOut, Radio, RefreshCw, Shield, User } from "lucide-react";
import { IcdrrmoLogo } from "@/components/icdrrmo-logo";
import { formatOpsClock } from "@/components/ops/ops-format";
import type { AgencyPortalConfig } from "@/components/agency/agency-config";

const NAV_ICONS = { desk: LayoutDashboard, profile: User } as const;

export function AgencyChrome({
  config,
  children,
  sessionLabel,
  socketLive,
  openCount,
  loading,
  onRefresh,
  onLogout,
  now,
}: {
  config: AgencyPortalConfig;
  children: ReactNode;
  sessionLabel: string;
  socketLive: boolean;
  openCount: number;
  loading: boolean;
  onRefresh: () => void;
  onLogout: () => void;
  now: Date;
}): ReactElement {
  const pathname = usePathname() ?? config.basePath;
  const BrandIcon = config.role === "PNP" ? Shield : Flame;
  const nav = [
    { href: config.basePath, label: "Agency desk", icon: NAV_ICONS.desk },
    { href: `${config.basePath}/profile`, label: "My profile", icon: NAV_ICONS.profile },
  ];
  const title =
    pathname === `${config.basePath}/profile`
      ? "My profile"
      : config.deskPageTitle;

  return (
    <div
      className="h-screen flex overflow-hidden bg-transparent text-zinc-100 font-sans"
      data-icdrrmo-console="agency-desk"
    >
      <aside className="hidden lg:flex w-[248px] shrink-0 flex-col border-r border-orange-500/15 bg-[#050505]">
        <div className="flex items-center gap-3 border-b border-orange-500/12 px-4 py-3.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl icd-logo-ring overflow-hidden p-0.5">
            <IcdrrmoLogo size={36} className="rounded-lg" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[10px] font-bold uppercase tracking-[0.22em] text-rose-300/95">
              {config.role}
            </p>
            <p className="truncate text-[11px] font-medium text-zinc-500">Agency console</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto scroll-ops px-2 py-3">
          <p className="px-2 pb-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-600">Modules</p>
          <nav className="space-y-0.5">
            {nav.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== config.basePath && pathname.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch
                  className={`relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 ${
                    active ? "icd-ops-nav-active" : "icd-ops-nav-idle"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0 opacity-90" strokeWidth={1.35} aria-hidden />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="border-t border-orange-500/12 p-3 text-[9px] leading-relaxed text-zinc-600">
          ICDRRMO partner agency
          <span className="mt-1 block text-zinc-500">{config.portalTitle}</span>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="shrink-0 border-b border-orange-500/15 bg-black/85 backdrop-blur-md z-20">
          <div className="flex flex-col gap-3 px-3 py-2.5 lg:px-5 icd-page-pad">
            <div className="icd-header-stack">
              <div className="min-w-0 flex-1">
                <h1 className="text-[14px] font-semibold tracking-tight text-white md:text-[15px] icd-text-safe flex items-center gap-2">
                  <BrandIcon className="h-4 w-4 text-orange-400 shrink-0" aria-hidden />
                  {title}
                </h1>
                <p className="text-[10px] text-zinc-400 mt-0.5 icd-truncate-safe">{formatOpsClock(now)}</p>
              </div>
              <div className="icd-badge-row">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-mono uppercase tracking-wide ${
                    socketLive
                      ? "border-orange-500/40 bg-orange-500/12 text-orange-100 animate-alert-blink"
                      : "border-zinc-700/80 bg-zinc-950/80 text-zinc-500"
                  }`}
                >
                  <Radio className="h-3 w-3 shrink-0" aria-hidden />
                  WS {socketLive ? "Live" : "Standby"}
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg border border-orange-500/25 bg-orange-950/25 px-2 py-1 font-mono text-[10px] text-orange-100 tabular-nums">
                  Queue {openCount}
                </span>
                <span className="hidden xl:inline-flex max-w-[200px] truncate rounded-lg border border-orange-500/20 bg-zinc-950/80 px-2 py-1 text-[10px] text-zinc-400">
                  {sessionLabel}
                </span>
                <button
                  type="button"
                  onClick={onRefresh}
                  disabled={loading}
                  className="inline-flex items-center gap-1 rounded-lg border border-orange-500/20 bg-white/[0.04] px-2.5 py-1.5 text-[10px] font-medium text-zinc-200 hover:bg-white/[0.07] disabled:opacity-40"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} aria-hidden />
                  Sync
                </button>
                <button
                  type="button"
                  onClick={onLogout}
                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-700/80 bg-zinc-900/90 px-2.5 py-1.5 text-[10px] font-medium text-zinc-200 hover:bg-zinc-800"
                >
                  <LogOut className="h-3.5 w-3.5" aria-hidden />
                  Out
                </button>
              </div>
            </div>
          </div>
        </header>

        <nav
          aria-label="Agency modules"
          className="lg:hidden shrink-0 border-b border-orange-500/12 bg-ops-rail overflow-x-auto scroll-ops"
        >
          <ul className="flex gap-px px-1 py-2 min-w-max">
            {nav.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href ||
                (item.href !== config.basePath && pathname.startsWith(item.href));
              return (
                <li key={`m-${item.href}`}>
                  <Link
                    href={item.href}
                    prefetch
                    className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-2 text-[11px] font-medium uppercase tracking-wide ${
                      active
                        ? "bg-rose-600/85 text-white"
                        : "text-zinc-500 hover:bg-white/[0.05] hover:text-zinc-200"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0 opacity-95" aria-hidden />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <main className="flex-1 min-h-0 overflow-auto scroll-ops pb-6">{children}</main>
      </div>
    </div>
  );
}
