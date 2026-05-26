"use client";

import type { ReactElement } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Waves } from "lucide-react";
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
  const [selectedId, setSelectedId] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, Partial<BarangayRow>>>({});
  const [citizenAlertTitle, setCitizenAlertTitle] = useState("");
  const [citizenAlertBody, setCitizenAlertBody] = useState("");
  const [saveOk, setSaveOk] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tokens?.accessToken) return;
    setErr(null);
    try {
      const list = await opsFetchJson<BarangayRow[]>("/barangays", tokens.accessToken);
      const next = Array.isArray(list) ? list : [];
      setRows(next);
      if (role === "OPERATOR") {
        const me = await opsFetchJson<{ profile: MeProfile | null }>("/users/me", tokens.accessToken);
        const bg = me.profile?.barangayId ?? null;
        setOperatorBarangayId(bg);
        setSelectedId(bg && next.some((r) => r.id === bg) ? bg : "");
      } else {
        setOperatorBarangayId(null);
        setSelectedId((prev) => {
          if (prev && next.some((r) => r.id === prev)) return prev;
          return next[0]?.id ?? "";
        });
      }
    } catch (e: unknown) {
      setErr(e instanceof OpsApiError ? opsApiErrorUserMessage(e) : "Failed to load barangays");
    } finally {
      setLoadedOnce(true);
    }
  }, [tokens?.accessToken, role]);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleRows = useMemo(() => {
    if (role !== "OPERATOR" || !operatorBarangayId) return rows;
    return rows.filter((r) => r.id === operatorBarangayId);
  }, [rows, role, operatorBarangayId]);

  const selected = useMemo(
    () => visibleRows.find((r) => r.id === selectedId) ?? visibleRows[0] ?? null,
    [visibleRows, selectedId],
  );

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
    setSaveOk(null);
    const customTitle = citizenAlertTitle.trim();
    const customBody = citizenAlertBody.trim();
    try {
      const updated = await opsFetchJson<BarangayRow>(`/barangays/${b.id}/ops-hazard`, tokens.accessToken, {
        method: "PATCH",
        body: JSON.stringify({
          opsFloodActive: m.opsFloodActive,
          opsFloodMessage: m.opsFloodMessage ?? "",
          opsRedZoneActive: m.opsRedZoneActive,
          opsRedZoneMessage: m.opsRedZoneMessage ?? "",
          ...(customTitle && customBody
            ? { citizenAlertTitle: customTitle, citizenAlertBody: customBody }
            : {}),
        }),
      });
      setRows((prev) => prev.map((r) => (r.id === b.id ? { ...r, ...updated } : r)));
      setDraft((prev) => {
        const n = { ...prev };
        delete n[b.id];
        return n;
      });
      if (customTitle && customBody) {
        setCitizenAlertTitle("");
        setCitizenAlertBody("");
      }
      setSaveOk(
        customTitle && customBody
          ? "Saved. Custom alert sent to citizens in this barangay."
          : m.opsFloodActive || m.opsRedZoneActive
            ? "Saved. Hazard alert sent to citizens in this barangay."
            : "Saved. Citizens were notified that hazard flags are cleared.",
      );
    } catch (e: unknown) {
      setErr(e instanceof OpsApiError ? opsApiErrorUserMessage(e) : "Save failed");
    } finally {
      setSavingId(null);
    }
  }

  const merged = selected ? mergeRow(selected) : null;
  const dis = !canHazard || !selected || savingId === selected.id;

  return (
    <div className="grid gap-4 p-4 lg:grid-cols-12 lg:p-6">
      <OpsPanelCard
        title="Barangay hazard alerts"
        subtitle="Select a barangay, set flood or red-zone advisories, then save to notify citizens in that barangay"
        className="lg:col-span-12"
      >
        {role === "OPERATOR" && !operatorBarangayId ? (
          <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-950/30 px-3 py-2 text-sm text-amber-100">
            Link your barangay on <strong>My profile</strong> before you can publish hazard alerts.
          </p>
        ) : null}
        {err ? <p className="mb-3 text-sm text-rose-300">{err}</p> : null}
        {saveOk ? <p className="mb-3 text-sm text-emerald-300">{saveOk}</p> : null}
        {!loadedOnce && visibleRows.length === 0 ? (
          <p className="text-sm text-zinc-500">Loading barangay list in the background…</p>
        ) : visibleRows.length === 0 ? (
          <p className="text-sm text-zinc-500">No barangays available.</p>
        ) : (
          <div className="space-y-5">
            {role === "OPERATOR" && visibleRows.length === 1 && selected ? (
              <div className="max-w-md space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Your barangay</span>
                <p className="rounded-lg border border-orange-500/20 bg-black/40 px-3 py-2.5 text-sm text-zinc-100">
                  {selected.name} ({selected.code})
                </p>
                <p className="text-[10px] text-zinc-500">
                  Operators are assigned to one barangay. Admins can switch barangay from the list below.
                </p>
              </div>
            ) : (
              <label className="block max-w-md space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Barangay</span>
                <select
                  value={selected?.id ?? ""}
                  onChange={(e) => {
                    setSelectedId(e.target.value);
                    setSaveOk(null);
                  }}
                  className="w-full rounded-lg border border-orange-500/20 bg-black/40 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-rose-500/40"
                >
                  {visibleRows.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </label>
            )}
            {selected ? (
              <p className="text-[10px] text-zinc-500 font-mono max-w-md">
                Barangay ID: {selected.id}
                {selected.opsHazardUpdatedAt
                  ? ` · Updated ${new Date(selected.opsHazardUpdatedAt).toLocaleString("en-PH")}`
                  : ""}
              </p>
            ) : null}

            {merged && selected ? (
              <div className="rounded-xl border border-orange-500/15 bg-black/35 p-4 space-y-4">
                <div className="flex flex-wrap gap-6">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-200">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-zinc-600"
                      checked={merged.opsFloodActive}
                      disabled={dis}
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...p,
                          [selected.id]: { ...d(selected.id), opsFloodActive: e.target.checked },
                        }))
                      }
                    />
                    <Waves className="h-4 w-4 text-orange-400" aria-hidden />
                    Flood advisory
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-200">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-zinc-600"
                      checked={merged.opsRedZoneActive}
                      disabled={dis}
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...p,
                          [selected.id]: { ...d(selected.id), opsRedZoneActive: e.target.checked },
                        }))
                      }
                    />
                    <AlertTriangle className="h-4 w-4 text-rose-400" aria-hidden />
                    Red zone
                  </label>
                </div>
                <label className="block space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Flood instructions</span>
                  <textarea
                    className="w-full min-h-[72px] rounded-lg border border-orange-500/20 bg-black/40 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600"
                    placeholder="Routes, evacuation, areas to avoid…"
                    value={merged.opsFloodMessage ?? ""}
                    disabled={dis}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        [selected.id]: { ...d(selected.id), opsFloodMessage: e.target.value },
                      }))
                    }
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Red zone instructions</span>
                  <textarea
                    className="w-full min-h-[72px] rounded-lg border border-orange-500/20 bg-black/40 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600"
                    placeholder="Stay-out areas, checkpoints, curfew…"
                    value={merged.opsRedZoneMessage ?? ""}
                    disabled={dis}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        [selected.id]: { ...d(selected.id), opsRedZoneMessage: e.target.value },
                      }))
                    }
                  />
                </label>
                <div className="rounded-lg border border-amber-500/20 bg-amber-950/20 p-3 space-y-3">
                  <p className="text-xs text-amber-100/90">
                    Optional: send a custom in-app alert to all registered citizens in this barangay (appears on their Alerts tab immediately).
                  </p>
                  <label className="block space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Alert title</span>
                    <input
                      className="w-full rounded-lg border border-orange-500/20 bg-black/40 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600"
                      placeholder="e.g. Flood watch tonight"
                      value={citizenAlertTitle}
                      disabled={dis}
                      onChange={(e) => setCitizenAlertTitle(e.target.value)}
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Alert message</span>
                    <textarea
                      className="w-full min-h-[72px] rounded-lg border border-orange-500/20 bg-black/40 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600"
                      placeholder="Evacuation routes, assembly points, hotline…"
                      value={citizenAlertBody}
                      disabled={dis}
                      onChange={(e) => setCitizenAlertBody(e.target.value)}
                    />
                  </label>
                </div>
                {canHazard ? (
                  <button
                    type="button"
                    disabled={dis}
                    onClick={() => void save(selected)}
                    className="rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-40"
                  >
                    {savingId === selected.id ? "Saving…" : "Save & alert citizens"}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </OpsPanelCard>
    </div>
  );
}
