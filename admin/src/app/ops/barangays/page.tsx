"use client";

import type { ReactElement } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2, Waves } from "lucide-react";
import { useOpsSession } from "@/components/ops/ops-session-context";
import { OpsPanelCard } from "@/components/ops/ops-widgets";
import { opsApiErrorUserMessage, opsFetchJson, OpsApiError } from "@/lib/ops-api";
import { jwtRole } from "@/lib/ops-jwt";

type BarangayRow = {
  id: string;
  code: string;
  name: string;
  isFloodProne: boolean;
  opsFloodActive: boolean;
  opsFloodMessage: string | null;
  opsRedZoneActive: boolean;
  opsRedZoneMessage: string | null;
  opsHazardUpdatedAt: string | null;
};

type MeProfile = { barangayId: string | null };

const HAZARD_ROLES = new Set(["ADMIN", "SUPER_ADMIN", "OPERATOR"]);

export default function OpsBarangaysPage(): ReactElement {
  const { tokens } = useOpsSession();
  const role = jwtRole(tokens?.accessToken);
  const canHazard = role != null && HAZARD_ROLES.has(role);
  const [rows, setRows] = useState<BarangayRow[]>([]);
  const [operatorBarangayId, setOperatorBarangayId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, Partial<BarangayRow>>>({});

  const load = useCallback(async () => {
    if (!tokens?.accessToken) return;
    setLoading(true);
    setErr(null);
    try {
      const list = await opsFetchJson<BarangayRow[]>("/barangays", tokens.accessToken);
      setRows(Array.isArray(list) ? list : []);
      if (role === "OPERATOR") {
        const me = await opsFetchJson<{ profile: MeProfile | null }>("/users/me", tokens.accessToken);
        setOperatorBarangayId(me.profile?.barangayId ?? null);
      } else {
        setOperatorBarangayId(null);
      }
    } catch (e: unknown) {
      setErr(e instanceof OpsApiError ? opsApiErrorUserMessage(e) : "Failed to load barangays");
    } finally {
      setLoading(false);
    }
  }, [tokens?.accessToken, role]);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleRows = useMemo(() => {
    if (role !== "OPERATOR" || !operatorBarangayId) return rows;
    return rows.filter((r) => r.id === operatorBarangayId);
  }, [rows, role, operatorBarangayId]);

  function d(id: string): Partial<BarangayRow> {
    return draft[id] ?? {};
  }

  function mergeRow(b: BarangayRow): BarangayRow {
    const o = d(b.id);
    return {
      ...b,
      opsFloodActive: o.opsFloodActive ?? b.opsFloodActive,
      opsFloodMessage: o.opsFloodMessage !== undefined ? o.opsFloodMessage : b.opsFloodMessage,
      opsRedZoneActive: o.opsRedZoneActive ?? b.opsRedZoneActive,
      opsRedZoneMessage: o.opsRedZoneMessage !== undefined ? o.opsRedZoneMessage : b.opsRedZoneMessage,
    };
  }

  async function save(b: BarangayRow): Promise<void> {
    if (!tokens?.accessToken || !canHazard) return;
    const m = mergeRow(b);
    setSavingId(b.id);
    setErr(null);
    try {
      const updated = await opsFetchJson<BarangayRow>(`/barangays/${b.id}/ops-hazard`, tokens.accessToken, {
        method: "PATCH",
        body: JSON.stringify({
          opsFloodActive: m.opsFloodActive,
          opsFloodMessage: m.opsFloodMessage ?? "",
          opsRedZoneActive: m.opsRedZoneActive,
          opsRedZoneMessage: m.opsRedZoneMessage ?? "",
        }),
      });
      setRows((prev) => prev.map((r) => (r.id === b.id ? { ...r, ...updated } : r)));
      setDraft((prev) => {
        const n = { ...prev };
        delete n[b.id];
        return n;
      });
    } catch (e: unknown) {
      setErr(e instanceof OpsApiError ? opsApiErrorUserMessage(e) : "Save failed");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="grid gap-4 p-4 lg:grid-cols-12 lg:p-6">
      <OpsPanelCard title="Barangay hazard controls" subtitle="Flood + red zone — pushes citizens in that barangay" className="lg:col-span-12">
        <p className="mb-4 max-w-3xl text-xs leading-relaxed text-zinc-500">
          When <strong className="text-zinc-400">Flood advisory</strong> or <strong className="text-zinc-400">Red zone</strong> is
          active and you save, every citizen app user registered in that barangay gets a{" "}
          <strong className="text-zinc-400">high-priority push</strong> (sound + vibration on supported devices). Weather
          digests go to <strong className="text-zinc-400">all citizens</strong> on a fixed schedule from the API server.
        </p>
        {role === "OPERATOR" && !operatorBarangayId ? (
          <p className="rounded-lg border border-amber-500/30 bg-amber-950/30 px-3 py-2 text-sm text-amber-100">
            Your operator profile has no barangay assigned — contact an admin to set{" "}
            <span className="font-mono">UserProfile.barangay_id</span> before you can update hazard flags.
          </p>
        ) : null}
        {err ? <p className="mb-3 text-sm text-rose-300">{err}</p> : null}
        {loading ? (
          <p className="flex items-center gap-2 text-sm text-zinc-400">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading…
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-orange-500/12">
            <table className="w-full min-w-[720px] text-left text-[13px] text-zinc-300">
              <thead className="border-b border-orange-500/12 bg-black/30 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-3 py-2">Barangay</th>
                  <th className="px-3 py-2">Code</th>
                  <th className="px-3 py-2">Flood</th>
                  <th className="px-3 py-2">Red zone</th>
                  <th className="px-3 py-2">Instructions</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((b) => {
                  const m = mergeRow(b);
                  const dis = !canHazard || savingId === b.id;
                  return (
                    <tr key={b.id} className="border-b border-white/[0.04] align-top last:border-0">
                      <td className="px-3 py-2 font-medium text-white">{b.name}</td>
                      <td className="px-3 py-2 font-mono text-[11px] text-zinc-500">{b.code}</td>
                      <td className="px-3 py-2">
                        <label className="flex cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-zinc-600"
                            checked={m.opsFloodActive}
                            disabled={dis}
                            onChange={(e) =>
                              setDraft((p) => ({
                                ...p,
                                [b.id]: { ...d(b.id), opsFloodActive: e.target.checked },
                              }))
                            }
                          />
                          <Waves className="h-4 w-4 text-orange-400" aria-hidden />
                        </label>
                      </td>
                      <td className="px-3 py-2">
                        <label className="flex cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-zinc-600"
                            checked={m.opsRedZoneActive}
                            disabled={dis}
                            onChange={(e) =>
                              setDraft((p) => ({
                                ...p,
                                [b.id]: { ...d(b.id), opsRedZoneActive: e.target.checked },
                              }))
                            }
                          />
                          <AlertTriangle className="h-4 w-4 text-rose-400" aria-hidden />
                        </label>
                      </td>
                      <td className="px-3 py-2">
                        <textarea
                          className="mb-1 w-full min-h-[52px] rounded-lg border border-orange-500/20 bg-black/40 px-2 py-1 text-[12px] text-zinc-200 placeholder:text-zinc-600"
                          placeholder="Flood message (routes, evacuation, avoid areas)…"
                          value={m.opsFloodMessage ?? ""}
                          disabled={dis}
                          onChange={(e) =>
                            setDraft((p) => ({
                              ...p,
                              [b.id]: { ...d(b.id), opsFloodMessage: e.target.value },
                            }))
                          }
                        />
                        <textarea
                          className="w-full min-h-[52px] rounded-lg border border-orange-500/20 bg-black/40 px-2 py-1 text-[12px] text-zinc-200 placeholder:text-zinc-600"
                          placeholder="Red zone message (stay out, checkpoints)…"
                          value={m.opsRedZoneMessage ?? ""}
                          disabled={dis}
                          onChange={(e) =>
                            setDraft((p) => ({
                              ...p,
                              [b.id]: { ...d(b.id), opsRedZoneMessage: e.target.value },
                            }))
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        {canHazard ? (
                          <button
                            type="button"
                            disabled={dis}
                            onClick={() => void save(b)}
                            className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-40"
                          >
                            {savingId === b.id ? "Saving…" : "Save & alert"}
                          </button>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </OpsPanelCard>
    </div>
  );
}
