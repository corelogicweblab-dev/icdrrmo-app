"use client";

import type { ReactElement } from "react";
import { useCallback, useEffect, useState } from "react";
import { Home, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useOpsSession } from "@/components/ops/ops-session-context";
import { OpsPanelCard } from "@/components/ops/ops-widgets";
import { opsFetchJson, OpsApiError } from "@/lib/ops-api";
import { ISABELA_EOC_LAT, ISABELA_EOC_LNG } from "@/lib/isabela-eoc";
import { jwtRole } from "@/lib/ops-jwt";

type EvacRow = {
  id: string;
  name: string;
  latitude: unknown;
  longitude: unknown;
  capacity: number | null;
  occupancy: number;
  contactPhone: string | null;
  notes: string | null;
  isActive: boolean;
  barangay: { id: string; name: string } | null;
};

type BarangayOpt = { id: string; name: string; code: string };

const EVAC_MANAGE_ROLES = new Set(["ADMIN", "SUPER_ADMIN", "OPERATOR"]);

export default function OpsEvacuationPage(): ReactElement {
  const { tokens } = useOpsSession();
  const role = jwtRole(tokens?.accessToken);
  const canManageEvacuation = role != null && EVAC_MANAGE_ROLES.has(role);
  const [rows, setRows] = useState<EvacRow[]>([]);
  const [barangays, setBarangays] = useState<BarangayOpt[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [lat, setLat] = useState(String(ISABELA_EOC_LAT));
  const [lng, setLng] = useState(String(ISABELA_EOC_LNG));
  const [capacity, setCapacity] = useState("");
  const [occupancy, setOccupancy] = useState("0");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [barangayId, setBarangayId] = useState("");
  const [isActive, setIsActive] = useState(true);

  const load = useCallback(async () => {
    if (!tokens?.accessToken) return;
    setLoading(true);
    setErr(null);
    try {
      const [centers, bg] = await Promise.all([
        opsFetchJson<EvacRow[]>("/evacuation-centers", tokens.accessToken),
        opsFetchJson<BarangayOpt[]>("/barangays", tokens.accessToken),
      ]);
      setRows(Array.isArray(centers) ? centers : []);
      setBarangays(Array.isArray(bg) ? bg : []);
    } catch (e: unknown) {
      setErr(e instanceof OpsApiError ? e.body?.slice(0, 200) ?? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [tokens?.accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate(): void {
    if (!canManageEvacuation) return;
    setEditingId(null);
    setName("");
    setLat(String(ISABELA_EOC_LAT));
    setLng(String(ISABELA_EOC_LNG));
    setCapacity("");
    setOccupancy("0");
    setPhone("");
    setNotes("");
    setBarangayId("");
    setIsActive(true);
    setModal("create");
  }

  function openEdit(e: EvacRow): void {
    if (!canManageEvacuation) return;
    setEditingId(e.id);
    setName(e.name);
    setLat(String(e.latitude ?? ""));
    setLng(String(e.longitude ?? ""));
    setCapacity(e.capacity != null ? String(e.capacity) : "");
    setOccupancy(String(e.occupancy));
    setPhone(e.contactPhone ?? "");
    setNotes(e.notes ?? "");
    setBarangayId(e.barangay?.id ?? "");
    setIsActive(e.isActive);
    setModal("edit");
  }

  async function submit(): Promise<void> {
    if (!tokens?.accessToken || !canManageEvacuation) return;
    setErr(null);
    const la = Number(lat);
    const lo = Number(lng);
    if (!Number.isFinite(la) || !Number.isFinite(lo)) {
      setErr("Valid latitude/longitude required.");
      return;
    }
    const body: Record<string, unknown> = {
      name: name.trim(),
      latitude: la,
      longitude: lo,
      occupancy: Number(occupancy) || 0,
      contactPhone: phone.trim() || undefined,
      notes: notes.trim() || undefined,
      barangayId: barangayId || undefined,
      isActive,
    };
    const cap = capacity.trim() ? Number(capacity) : undefined;
    if (cap !== undefined && Number.isFinite(cap)) body.capacity = cap;
    try {
      if (modal === "create") {
        await opsFetchJson("/evacuation-centers", tokens.accessToken, {
          method: "POST",
          body: JSON.stringify(body),
        });
      } else if (modal === "edit" && editingId) {
        await opsFetchJson(`/evacuation-centers/${editingId}`, tokens.accessToken, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      }
      setModal(null);
      await load();
    } catch (e: unknown) {
      setErr(e instanceof OpsApiError ? e.body?.slice(0, 240) ?? e.message : "Save failed");
    }
  }

  async function deactivate(id: string): Promise<void> {
    if (!tokens?.accessToken || !canManageEvacuation) return;
    if (!confirm("Deactivate this evacuation center?")) return;
    try {
      await opsFetchJson(`/evacuation-centers/${id}`, tokens.accessToken, { method: "DELETE" });
      await load();
    } catch (e: unknown) {
      setErr(e instanceof OpsApiError ? e.body?.slice(0, 240) ?? e.message : "Delete failed");
    }
  }

  if (!tokens?.accessToken) {
    return <p className="p-6 text-sm text-zinc-500">Sign in to manage evacuation centers.</p>;
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <OpsPanelCard title="Evacuation centers" subtitle="Manage shelter sites and capacity">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-200"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            Refresh
          </button>
          {canManageEvacuation ? (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-lg bg-rose-600/90 px-3 py-1.5 text-xs font-semibold text-white"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Add center
            </button>
          ) : (
            <p className="text-[10px] text-zinc-500">Admin or Operator role required to add or edit centers.</p>
          )}
        </div>
        {err ? <p className="mb-2 text-xs text-rose-300">{err}</p> : null}
        <ul className="space-y-3">
          {rows.map((s) => (
            <li key={s.id} className="rounded-xl border border-white/[0.06] bg-black/30 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white flex items-center gap-2">
                    <Home className="h-4 w-4 text-emerald-400" aria-hidden />
                    {s.name}
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    {s.barangay?.name ?? "No barangay"} · {s.isActive ? "active" : "inactive"}
                  </p>
                  <p className="font-mono text-[10px] text-zinc-600 mt-1">
                    {s.latitude != null && s.longitude != null
                      ? `${Number(s.latitude).toFixed(4)}, ${Number(s.longitude).toFixed(4)}`
                      : "—"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-mono text-zinc-400">
                    {s.occupancy}/{s.capacity ?? "—"}
                  </p>
                  <div className="mt-2 flex justify-end gap-1">
                    {canManageEvacuation ? (
                      <>
                        <button type="button" onClick={() => openEdit(s)} className="p-1 text-sky-300 hover:bg-white/10">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => void deactivate(s.id)} className="p-1 text-rose-300 hover:bg-white/10">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="mt-2 h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500/45"
                  style={{
                    width: `${s.capacity ? Math.min(100, (s.occupancy / s.capacity) * 100) : 0}%`,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      </OpsPanelCard>

      {modal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0c0c0f] p-5 max-h-[90vh] overflow-y-auto">
            <h2 className="mb-4 text-sm font-semibold text-white">{modal === "create" ? "New center" : "Edit center"}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-[10px] uppercase text-zinc-500 sm:col-span-2">
                Name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="block text-[10px] uppercase text-zinc-500">
                Latitude
                <input value={lat} onChange={(e) => setLat(e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 font-mono text-sm text-white" />
              </label>
              <label className="block text-[10px] uppercase text-zinc-500">
                Longitude
                <input value={lng} onChange={(e) => setLng(e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 font-mono text-sm text-white" />
              </label>
              <label className="block text-[10px] uppercase text-zinc-500">
                Capacity
                <input value={capacity} onChange={(e) => setCapacity(e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white" />
              </label>
              <label className="block text-[10px] uppercase text-zinc-500">
                Occupancy
                <input value={occupancy} onChange={(e) => setOccupancy(e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white" />
              </label>
              <label className="block text-[10px] uppercase text-zinc-500">
                Contact phone
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white" />
              </label>
              <label className="block text-[10px] uppercase text-zinc-500">
                Barangay
                <select value={barangayId} onChange={(e) => setBarangayId(e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white">
                  <option value="">—</option>
                  {barangays.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-[10px] uppercase text-zinc-500 sm:col-span-2">
                Notes
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white" />
              </label>
              <label className="flex items-center gap-2 text-xs text-zinc-400 sm:col-span-2">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded border-zinc-600" />
                Active
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setModal(null)} className="rounded-lg border border-white/10 px-4 py-2 text-xs text-zinc-300">
                Cancel
              </button>
              <button type="button" onClick={() => void submit()} className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white">
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
