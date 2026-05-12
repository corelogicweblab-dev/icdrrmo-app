"use client";

import type { ReactElement } from "react";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Trash2, Truck } from "lucide-react";
import { useOpsSession } from "@/components/ops/ops-session-context";
import { OpsPanelCard } from "@/components/ops/ops-widgets";
import { opsFetchJson, OpsApiError } from "@/lib/ops-api";
import { VEHICLE_FLEET_STATUSES } from "@/lib/icdrrmo-constants";

type VehicleRow = {
  id: string;
  plateNumber: string;
  name: string | null;
  type: string | null;
  fleetStatus: string;
  isActive: boolean;
  latitude?: unknown;
  longitude?: unknown;
  lastLocationAt?: string | null;
};

const emptyForm = {
  plateNumber: "",
  name: "",
  type: "",
  fleetStatus: "AVAILABLE",
  latitude: "",
  longitude: "",
  isActive: true,
};

export default function OpsVehiclesPage(): ReactElement {
  const { tokens } = useOpsSession();
  const [rows, setRows] = useState<VehicleRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    if (!tokens?.accessToken) return;
    setLoading(true);
    setErr(null);
    try {
      const data = await opsFetchJson<VehicleRow[]>("/vehicles", tokens.accessToken);
      setRows(Array.isArray(data) ? data : []);
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
    setForm(emptyForm);
    setEditingId(null);
    setModal("create");
  }

  function openEdit(v: VehicleRow): void {
    setEditingId(v.id);
    setForm({
      plateNumber: v.plateNumber,
      name: v.name ?? "",
      type: v.type ?? "",
      fleetStatus: v.fleetStatus,
      latitude: v.latitude != null ? String(v.latitude) : "",
      longitude: v.longitude != null ? String(v.longitude) : "",
      isActive: v.isActive,
    });
    setModal("edit");
  }

  async function submit(): Promise<void> {
    if (!tokens?.accessToken) return;
    setErr(null);
    const body: Record<string, unknown> = {
      plateNumber: form.plateNumber.trim(),
      name: form.name.trim() || undefined,
      type: form.type.trim() || undefined,
      fleetStatus: form.fleetStatus,
      isActive: form.isActive,
    };
    const la = form.latitude.trim() ? Number(form.latitude) : undefined;
    const lo = form.longitude.trim() ? Number(form.longitude) : undefined;
    if (la !== undefined && Number.isFinite(la)) body.latitude = la;
    if (lo !== undefined && Number.isFinite(lo)) body.longitude = lo;
    try {
      if (modal === "create") {
        await opsFetchJson("/vehicles", tokens.accessToken, {
          method: "POST",
          body: JSON.stringify(body),
        });
      } else if (modal === "edit" && editingId) {
        await opsFetchJson(`/vehicles/${editingId}`, tokens.accessToken, {
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
    if (!tokens?.accessToken) return;
    if (!confirm("Deactivate this vehicle?")) return;
    try {
      await opsFetchJson(`/vehicles/${id}`, tokens.accessToken, { method: "DELETE" });
      await load();
    } catch (e: unknown) {
      setErr(e instanceof OpsApiError ? e.body?.slice(0, 240) ?? e.message : "Delete failed");
    }
  }

  if (!tokens?.accessToken) {
    return <p className="p-6 text-sm text-zinc-500">Sign in to manage vehicles.</p>;
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <OpsPanelCard title="Fleet registry" subtitle="Vehicles, plates, and optional GPS for maps">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-200 hover:bg-white/[0.05]"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            Refresh
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-rose-600/90 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add vehicle
          </button>
        </div>
        {err ? <p className="mb-2 text-xs text-rose-300">{err}</p> : null}
        <div className="overflow-x-auto rounded-lg border border-white/[0.06]">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-black/40 text-[10px] uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-3 py-2">Plate</th>
                <th className="px-3 py-2">Name / type</th>
                <th className="px-3 py-2">Fleet</th>
                <th className="px-3 py-2">GPS</th>
                <th className="px-3 py-2">Active</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] text-zinc-200">
              {rows.map((v) => (
                <tr key={v.id} className="hover:bg-white/[0.02]">
                  <td className="px-3 py-2 font-mono text-rose-200/90">{v.plateNumber}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-white">{v.name ?? "—"}</div>
                    <div className="text-zinc-500">{v.type ?? ""}</div>
                  </td>
                  <td className="px-3 py-2 text-zinc-400">{v.fleetStatus}</td>
                  <td className="px-3 py-2 font-mono text-[10px] text-zinc-500">
                    {v.latitude != null && v.longitude != null
                      ? `${Number(v.latitude).toFixed(4)}, ${Number(v.longitude).toFixed(4)}`
                      : "—"}
                  </td>
                  <td className="px-3 py-2">{v.isActive ? "yes" : "no"}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(v)}
                      className="mr-2 rounded p-1 text-sky-300 hover:bg-white/10"
                      aria-label="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void deactivate(v.id)}
                      className="rounded p-1 text-rose-300 hover:bg-white/10"
                      aria-label="Deactivate"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </OpsPanelCard>

      {modal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0c0c0f] p-5 shadow-panel">
            <div className="mb-4 flex items-center gap-2 text-white">
              <Truck className="h-5 w-5 text-rose-400" aria-hidden />
              <h2 className="text-sm font-semibold">{modal === "create" ? "New vehicle" : "Edit vehicle"}</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-[10px] uppercase text-zinc-500 sm:col-span-2">
                Plate number
                <input
                  value={form.plateNumber}
                  onChange={(e) => setForm((f) => ({ ...f, plateNumber: e.target.value }))}
                  disabled={modal === "edit"}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white disabled:opacity-50"
                />
              </label>
              <label className="block text-[10px] uppercase text-zinc-500">
                Name
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="block text-[10px] uppercase text-zinc-500">
                Type
                <input
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="block text-[10px] uppercase text-zinc-500">
                Fleet status
                <select
                  value={form.fleetStatus}
                  onChange={(e) => setForm((f) => ({ ...f, fleetStatus: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white"
                >
                  {VEHICLE_FLEET_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-xs text-zinc-400 sm:col-span-1 sm:mt-6">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  className="rounded border-zinc-600"
                />
                Active
              </label>
              <label className="block text-[10px] uppercase text-zinc-500">
                Latitude (optional)
                <input
                  value={form.latitude}
                  onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 font-mono text-sm text-white"
                />
              </label>
              <label className="block text-[10px] uppercase text-zinc-500">
                Longitude (optional)
                <input
                  value={form.longitude}
                  onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 font-mono text-sm text-white"
                />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="rounded-lg border border-white/10 px-4 py-2 text-xs text-zinc-300 hover:bg-white/[0.05]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submit()}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
