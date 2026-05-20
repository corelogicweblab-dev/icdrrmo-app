"use client";

import type { ReactElement } from "react";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Building2,
  Home,
  Map,
  Radio,
  Send,
  Shield,
  Truck,
  Users,
  Wind,
} from "lucide-react";
import { useOpsSession } from "@/components/ops/ops-session-context";
import { OpsKpiCard, OpsPanelCard } from "@/components/ops/ops-widgets";
import {
  loadCommandCenterSnapshot,
  type CommandCenterSnapshot,
} from "@/lib/command-center-snapshot";
import { isOpsGlobalAdmin } from "@/lib/decode-jwt-role";

function urgencyClass(u: string): string {
  if (u === "critical") return "border-rose-500/50 bg-rose-950/40 text-rose-100 animate-alert-blink";
  if (u === "high") return "border-orange-500/40 bg-orange-950/35 text-orange-100";
  return "border-orange-500/20 bg-black/40 text-zinc-300";
}

export function SmartCommandCenter(): ReactElement {
  const { tokens, queue } = useOpsSession();
  const [snap, setSnap] = useState<CommandCenterSnapshot | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const token = tokens?.accessToken;
    if (!token) return;
    setLoading(true);
    try {
      const { snapshot, usedLegacyFallback } = await loadCommandCenterSnapshot(token);
      setSnap(snapshot);
      setErr(null);
      const missingBg = snapshot.summary.operatorBarangayMissing === true;
      setNotice(
        missingBg
          ? "Your operator profile has no barangay assigned — city-wide counts are hidden. Ask an admin to set profile.barangayId."
          : usedLegacyFallback
            ? "Using dashboard fallback — redeploy the Nest API on Render for full command-center analytics."
            : null,
      );
    } catch (e: unknown) {
      setSnap(null);
      setNotice(null);
      setErr(
        e instanceof Error
          ? e.message.startsWith("HTTP ")
            ? "Command desk data is unavailable. Confirm the API is online and redeployed (Render), then use Sync."
            : e.message
          : "Failed to load command center",
      );
    } finally {
      setLoading(false);
    }
  }, [tokens?.accessToken]);

  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), 45_000);
    return () => window.clearInterval(t);
  }, [load]);

  const s = snap?.summary;
  const openCount = s?.openIncidents ?? queue.length;

  return (
    <div className="flex flex-col gap-5 p-4 lg:p-6">
      <header className="icd-header-stack rounded-2xl border border-orange-500/20 bg-black/50 px-4 py-3 backdrop-blur-md">
        <div>
          <p className="icd-eyebrow">ICDRRMO · Enterprise EOC</p>
          <h1 className="text-lg font-semibold text-white md:text-xl icd-text-safe">Smart Command Center</h1>
          <p className="text-[11px] text-zinc-500 mt-1 max-w-2xl">
            Live incidents · resource tracker · hazard intelligence · audit trail · barangay multi-tenancy
            {snap?.readOnly ? " · Auditor read-only mode" : ""}
          </p>
        </div>
        <div className="icd-badge-row">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-orange-500/30 bg-orange-950/25 px-2 py-1 text-[10px] text-orange-100">
            <Radio className="h-3 w-3 animate-live-pulse" aria-hidden />
            Live desk
          </span>
          {snap?.federation.ssoEnabled ? (
            <span className="rounded-lg border border-orange-500/20 px-2 py-1 text-[10px] text-zinc-400">
              SSO · {snap.federation.provider}
            </span>
          ) : (
            <span className="rounded-lg border border-orange-500/15 px-2 py-1 text-[10px] text-zinc-500">
              Local JWT auth
            </span>
          )}
        </div>
      </header>

      {err ? (
        <p className="text-sm text-rose-300" role="alert">
          {err}
        </p>
      ) : null}
      {notice && !err ? (
        <p className="text-sm text-amber-200/90" role="status">
          {notice}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <OpsKpiCard
          icon={Activity}
          label="Open incidents"
          value={loading ? "…" : String(openCount)}
          subtitle="Realtime queue + Socket.IO feed"
          accent="rose"
        />
        <OpsKpiCard
          icon={Users}
          label="Active responders"
          value={loading ? "…" : String(s?.activeResponders ?? 0)}
          subtitle={`${snap?.resources.responders.available ?? 0} available · ${snap?.resources.responders.onMission ?? 0} on mission`}
          accent="emerald"
        />
        <OpsKpiCard
          icon={Truck}
          label="Fleet resources"
          value={loading ? "…" : String(s?.activeVehicles ?? 0)}
          subtitle={`${snap?.resources.vehicles.available ?? 0} ready · ${snap?.resources.vehicles.deployed ?? 0} deployed`}
          accent="sky"
        />
        <OpsKpiCard
          icon={Home}
          label="Evacuation sites"
          value={loading ? "…" : String(s?.evacuationSites ?? 0)}
          subtitle={
            snap?.evacuation.alerts.length
              ? `${snap.evacuation.alerts.length} capacity alert(s)`
              : "Occupancy within normal range"
          }
          accent="amber"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <OpsPanelCard title="Live incidents" subtitle="Severity · location · status" className="xl:col-span-5">
          <ul className="space-y-2 max-h-[320px] overflow-y-auto scroll-ops">
            {(snap?.liveIncidents.length ? snap.liveIncidents : queue.map((i) => ({
              id: i.id,
              type: i.type,
              status: i.status,
              urgency: i.status === "OPEN" ? ("high" as const) : ("moderate" as const),
              barangay: null,
              assignedEmail: i.assigned?.user.email ?? null,
            }))).map((inc) => (
              <li key={inc.id}>
                <Link
                  href={`/ops/incidents?id=${encodeURIComponent(inc.id)}`}
                  className={`block rounded-xl border px-3 py-2.5 transition hover:brightness-110 ${urgencyClass(inc.urgency)}`}
                >
                  <div className="flex justify-between gap-2 text-xs">
                    <span className="font-semibold uppercase">{inc.type.replace(/_/g, " ")}</span>
                    <span className="font-mono opacity-80">{inc.status}</span>
                  </div>
                  <p className="mt-1 text-[10px] opacity-85">
                    {inc.barangay?.name ?? "—"} · {inc.assignedEmail ?? "Unassigned"}
                  </p>
                </Link>
              </li>
            ))}
            {!loading && !snap?.liveIncidents.length && !queue.length ? (
              <p className="text-xs text-zinc-500">No open incidents in scope.</p>
            ) : null}
          </ul>
          <Link href="/ops/incidents" className="mt-3 inline-block text-xs text-orange-400 hover:underline">
            Open incident management →
          </Link>
        </OpsPanelCard>

        <OpsPanelCard title="Predictive risk matrix" subtitle="Weather + barangay hazard flags" className="xl:col-span-4">
          {snap?.intelligence.rainOutlook ? (
            <p className="mb-3 text-xs text-orange-200/90 flex gap-2 items-start">
              <Wind className="h-4 w-4 shrink-0" aria-hidden />
              {snap.intelligence.rainOutlook.headline}
            </p>
          ) : null}
          <ul className="space-y-1.5 max-h-[280px] overflow-y-auto scroll-ops text-[11px]">
            {snap?.intelligence.riskMatrix.slice(0, 10).map((r) => (
              <li
                key={r.name}
                className={`flex justify-between rounded-lg border px-2 py-1.5 ${
                  r.level === "critical"
                    ? "border-rose-500/40 bg-rose-950/30"
                    : r.level === "high"
                      ? "border-orange-500/35 bg-orange-950/20"
                      : "border-orange-500/12 bg-black/30"
                }`}
              >
                <span className="text-zinc-300 truncate pr-2">{r.name}</span>
                <span className="font-mono text-orange-200 shrink-0">{r.score}</span>
              </li>
            ))}
          </ul>
          <Link href="/ops/analytics" className="mt-3 inline-block text-xs text-orange-400 hover:underline">
            Analytics desk →
          </Link>
        </OpsPanelCard>

        <OpsPanelCard title="Audit & comms" subtitle="DPA / COA compliance trail" className="xl:col-span-3">
          <ul className="space-y-2 text-[10px] font-mono text-zinc-400 max-h-[280px] overflow-y-auto scroll-ops">
            {snap?.communications.recentAudit.map((a) => (
              <li key={a.id} className="border-b border-orange-500/10 pb-1.5">
                <span className="text-zinc-600">{new Date(a.at).toLocaleString("en-PH")}</span>
                <br />
                <span className="text-orange-200/90">{a.action}</span> · {a.actor}
              </li>
            ))}
          </ul>
          <Link href="/ops/audit" className="mt-3 inline-block text-xs text-orange-400 hover:underline">
            Full audit ledger →
          </Link>
        </OpsPanelCard>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: "/ops/map", label: "Realtime map", icon: Map },
          { href: "/ops/dispatch", label: "Auto-dispatch", icon: Send },
          { href: "/ops/evacuation", label: "Evacuation centers", icon: Home },
          { href: "/ops/barangays", label: "Hazard mapping", icon: Building2 },
          { href: "/ops/weather", label: "Weather intelligence", icon: Wind },
          { href: "/ops/notifications", label: "Alerts & SMS", icon: AlertTriangle },
          ...(isOpsGlobalAdmin(tokens?.accessToken)
            ? [{ href: "/ops/users", label: "Users & RBAC", icon: Shield }]
            : []),
        ].map((m) => {
          const Icon = m.icon;
          return (
            <Link
              key={m.href}
              href={m.href}
              className="flex items-center gap-3 rounded-xl border border-orange-500/15 bg-black/40 px-4 py-3 text-sm text-zinc-200 hover:border-orange-500/35 hover:bg-orange-950/15 transition"
            >
              <Icon className="h-5 w-5 text-orange-400 shrink-0" aria-hidden />
              {m.label}
            </Link>
          );
        })}
      </div>

      <p className="text-center text-[10px] text-zinc-600 tracking-wide">
        Incident heatmap clusters: <span className="text-orange-400/80">{snap?.intelligence.heatmapPoints.length ?? 0}</span>{" "}
        active points · Generated {snap?.generatedAt ? new Date(snap.generatedAt).toLocaleTimeString("en-PH") : "—"}
      </p>
    </div>
  );
}
