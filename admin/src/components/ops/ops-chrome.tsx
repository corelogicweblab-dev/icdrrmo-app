"use client";

import type { ReactElement, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Database,
  Headphones,
  LogOut,
  Maximize2,
  Minimize2,
  Radio,
  RefreshCw,
  Server,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
} from "lucide-react";
import { getApiBaseUrl, getHealthCheckUrl } from "@/lib/env";
import { OPS_NAV_SECTIONS, OPS_PAGE_TITLES } from "@/components/ops/ops-nav";
import { isOpsGlobalAdmin } from "@/lib/decode-jwt-role";
import { useOpsSession } from "@/components/ops/ops-session-context";
import { decodeJwtEmail, formatOpsClock, formatOpsSync } from "@/components/ops/ops-format";
import { IcdrrmoLogo } from "@/components/icdrrmo-logo";
import { OpsStatusCapsule } from "@/components/ops/ops-widgets";
import { OpsVoiceRingOverlay } from "@/components/ops/ops-voice-ring-overlay";

export function OpsChrome({ children }: { children: ReactNode }): ReactElement {
  const pathname = usePathname() ?? "/ops";
  const {
    logout,
    socketState,
    wsErrorDetail,
    queue,
    queueLoading,
    refreshQueue,
    tokens,
    apiReachable,
    lastHealthAt,
    lastSocketAt,
    now,
    soundMuted,
    setSoundMuted,
  } = useOpsSession();

  const [fullscreen, setFullscreen] = useState(false);
  const title = OPS_PAGE_TITLES[pathname] ?? "Operation center";

  const navSections = useMemo(() => {
    const admin = isOpsGlobalAdmin(tokens?.accessToken);
    return OPS_NAV_SECTIONS.map((sec) => ({
      ...sec,
      items: sec.items.filter((it) => (it.href === "/ops/system" ? admin : true)),
    }));
  }, [tokens?.accessToken]);

  const showInfraHealthRow = isOpsGlobalAdmin(tokens?.accessToken);

  const sessionLabel = tokens?.accessToken
    ? decodeJwtEmail(tokens.accessToken) ?? "Ops session"
    : "—";

  useEffect(() => {
    const onFs = (): void => {
      setFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      /* ignored */
    }
  }, []);

  const wsLabel =
    socketState === "live" ? "Live" : socketState === "error" ? "Fault" : "Standby";

  const openCount = queue.length;
  const sosAlerts = queue.filter((q) => {
    const c = q.channel?.toUpperCase?.() ?? "";
    return c.includes("SMS") || c.includes("MOBILE");
  }).length;

  return (
    <div
      className="h-screen flex overflow-hidden bg-[#060608] text-zinc-100 font-sans"
      data-icdrrmo-console="ops-v2-command-board"
    >
      <aside className="hidden lg:flex w-[248px] shrink-0 flex-col border-r border-white/[0.06] bg-[#080809]">
        <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/50 ring-1 ring-white/10 overflow-hidden p-0.5">
            <IcdrrmoLogo size={36} className="rounded-lg" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[10px] font-bold uppercase tracking-[0.22em] text-rose-300/95">
              ICDRRMO
            </p>
            <p className="truncate text-[11px] font-medium text-zinc-500">Command console</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto scroll-ops px-2 py-3 space-y-5">
          {navSections.map((sec) => (
            <div key={sec.title}>
              <p className="px-2 pb-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-600">
                {sec.title}
              </p>
              <nav className="space-y-0.5">
                {sec.items.map((item) => {
                  const active = pathname === item.href || (item.href !== "/ops" && pathname.startsWith(item.href));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch
                      className={`relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition outline-none ring-rose-500/30 focus-visible:ring-2 ${
                        active
                          ? "bg-white/[0.08] font-medium text-white ring-1 ring-rose-500/30 shadow-[inset_3px_0_0_rgba(225,29,72,0.9)]"
                          : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300"
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
          ))}
        </div>
        <div className="border-t border-white/[0.06] p-3 text-[9px] leading-relaxed text-zinc-600">
          Isabela City DRRMO · Multi-module EOC
          <span className="mt-1 block text-zinc-500">Powered by: CoreLogic</span>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="shrink-0 border-b border-white/[0.06] bg-black/50 backdrop-blur-md z-20">
          <div className="flex flex-col gap-3 px-3 py-2.5 lg:px-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-[14px] font-semibold tracking-tight text-white md:text-[15px]">{title}</h1>
                <p className="text-[10px] text-zinc-500 mt-0.5 truncate">
                  {formatOpsClock(now)} · REST {getApiBaseUrl().replace(/^https?:\/\//, "")}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-mono uppercase tracking-wide ${
                    socketState === "live"
                      ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-200 animate-alert-blink"
                      : socketState === "error"
                        ? "border-rose-500/40 bg-rose-950/40 text-rose-200"
                        : "border-zinc-700/80 bg-zinc-950/80 text-zinc-500"
                  }`}
                  title={wsErrorDetail ?? ""}
                >
                  <Radio className="h-3 w-3 shrink-0" aria-hidden />
                  WS {wsLabel}
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] uppercase tracking-wide ${
                    apiReachable
                      ? "border-emerald-500/28 bg-black/40 text-emerald-200/90"
                      : "border-amber-500/25 bg-amber-950/25 text-amber-200"
                  }`}
                >
                  {apiReachable ? (
                    <Wifi className="h-3 w-3" aria-hidden />
                  ) : (
                    <WifiOff className="h-3 w-3 text-amber-400" aria-hidden />
                  )}
                  {apiReachable ? "Online" : "Offline"}
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg border border-sky-500/25 bg-sky-950/20 px-2 py-1 font-mono text-[10px] text-sky-200 tabular-nums">
                  Cases {openCount}
                </span>
                {openCount > 0 ? (
                  <span className="relative inline-flex items-center rounded-lg border border-rose-500/35 bg-rose-600/20 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-rose-100 animate-alert-blink">
                    SOS+
                    <span className="ml-1 rounded bg-black/35 px-1 font-mono tabular-nums">{sosAlerts || openCount}</span>
                  </span>
                ) : (
                  <span className="inline-flex rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] uppercase tracking-wide text-zinc-500">
                    Clear
                  </span>
                )}
                <button
                  type="button"
                  aria-label={soundMuted ? "Enable alert sound" : "Mute alert sound"}
                  onClick={() => setSoundMuted(!soundMuted)}
                  className="inline-flex items-center rounded-lg border border-white/10 bg-white/[0.04] p-2 text-zinc-300 hover:bg-white/[0.08]"
                >
                  {soundMuted ? (
                    <VolumeX className="h-4 w-4 text-rose-400" aria-hidden />
                  ) : (
                    <Volume2 className="h-4 w-4 text-emerald-300" aria-hidden />
                  )}
                </button>
                <span className="hidden md:inline-flex items-center gap-1 rounded-lg border border-amber-500/20 bg-amber-950/15 px-2 py-1 text-[10px] text-amber-100/90">
                  <span className="text-amber-400/90" aria-hidden>
                    ◎
                  </span>
                  31°C · HI 36
                </span>
                <span className="hidden xl:inline-flex max-w-[200px] truncate rounded-lg border border-white/10 bg-zinc-950/80 px-2 py-1 text-[10px] text-zinc-400">
                  {sessionLabel}
                </span>
                <button
                  type="button"
                  aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
                  onClick={() => void toggleFullscreen()}
                  className="inline-flex items-center rounded-lg border border-white/10 bg-white/[0.04] p-2 text-zinc-300 hover:bg-white/[0.08]"
                >
                  {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => tokens?.accessToken && void refreshQueue(tokens.accessToken)}
                  disabled={queueLoading || !tokens}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[10px] font-medium text-zinc-200 hover:bg-white/[0.07] disabled:opacity-40"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${queueLoading ? "animate-spin" : ""}`} aria-hidden />
                  Sync
                </button>
                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-700/80 bg-zinc-900/90 px-2.5 py-1.5 text-[10px] font-medium text-zinc-200 hover:bg-zinc-800"
                >
                  <LogOut className="h-3.5 w-3.5" aria-hidden />
                  Out
                </button>
              </div>
            </div>
            {showInfraHealthRow ? (
              <div className="hidden sm:flex flex-wrap items-center gap-2 border-t border-white/[0.04] pt-2">
                <OpsStatusCapsule
                  icon={Database}
                  label="PostgreSQL"
                  state={apiReachable === false ? "bad" : apiReachable ? "good" : "idle"}
                  detail={lastHealthAt ? `Ready · ${formatOpsSync(lastHealthAt)}` : `GET ${getHealthCheckUrl()}`}
                />
                <OpsStatusCapsule
                  icon={Server}
                  label="Socket.IO"
                  state={socketState === "live" ? "good" : socketState === "error" ? "bad" : "idle"}
                  detail={
                    socketState === "live"
                      ? `Ops · ${formatOpsSync(lastSocketAt)}`
                      : socketState === "error"
                        ? wsErrorDetail ?? "Fault"
                        : "Standby"
                  }
                />
                <OpsStatusCapsule
                  icon={Headphones}
                  label="Voice bridge"
                  state="idle"
                  detail="WebRTC / Agora — configure in Voice panel"
                />
              </div>
            ) : null}
          </div>
        </header>

        <nav
          aria-label="Operational modules"
          className="lg:hidden shrink-0 border-b border-white/[0.06] bg-[#09090c] overflow-x-auto scroll-ops"
        >
          <ul className="flex gap-px px-1 py-2 min-w-max">
            {navSections.flatMap((sec) => sec.items).map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href || (item.href !== "/ops" && pathname.startsWith(item.href));
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
                    <span className="max-w-[116px] truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <main className="flex-1 overflow-auto scroll-ops">{children}</main>
      </div>
      <OpsVoiceRingOverlay />
    </div>
  );
}
