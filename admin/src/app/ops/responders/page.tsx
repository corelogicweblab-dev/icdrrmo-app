"use client";

import type { ReactElement } from "react";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Trash2, Users } from "lucide-react";
import { useOpsSession } from "@/components/ops/ops-session-context";
import { OpsPanelCard } from "@/components/ops/ops-widgets";
import { opsFetchJson, OpsApiError } from "@/lib/ops-api";
import { RESPONDER_STATUSES } from "@/lib/icdrrmo-constants";

type ResponderRow = {
  id: string;
  badgeNumber: string | null;
  status: string;
  user: { id: string; email: string; phone?: string | null };
  vehicle: { id: string; plateNumber: string } | null;
};

type UserPick = { id: string; email: string; role: string };
type VehiclePick = { id: string; plateNumber: string };

export default function OpsRespondersPage(): ReactElement {
  const { tokens } = useOpsSession();
  const [rows, setRows] = useState<ResponderRow[]>([]);
  const [users, setUsers] = useState<UserPick[]>([]);
  const [vehicles, setVehicles] = useState<VehiclePick[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [userId, setUserId] = useState("");
  const [badge, setBadge] = useState("");
  const [status, setStatus] = useState("AVAILABLE");
  const [vehicleId, setVehicleId] = useState("");
  const [editEmail, setEditEmail] = useState("");

  const load = useCallback(async () => {
    if (!tokens?.accessToken) return;
    setLoading(true);
    setErr(null);
    try {
      const [rList, uList, vList] = await Promise.all([
        opsFetchJson<ResponderRow[]>("/responders", tokens.accessToken),
        opsFetchJson<{ items: UserPick[] }>("/users?page=1&limit=80", tokens.accessToken),
        opsFetchJson<VehiclePick[]>("/vehicles", tokens.accessToken),
      ]);
      setRows(Array.isArray(rList) ? rList : []);
      setUsers(Array.isArray(uList?.items) ? uList.items : []);
      setVehicles(Array.isArray(vList) ? vList : []);
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
    setEditingId(null);
    setUserId("");
    setBadge("");
    setStatus("AVAILABLE");
    setVehicleId("");
    setModal("create");
  }

  function openEdit(r: ResponderRow): void {
    setEditingId(r.id);
    setUserId(r.user.id);
    setEditEmail(r.user.email);
    setBadge(r.badgeNumber ?? "");
    setStatus(r.status);
    setVehicleId(r.vehicle?.id ?? "");
    setModal("edit");
  }

  async function submit(): Promise<void> {
    if (!tokens?.accessToken) return;
    setErr(null);
    try {
      if (modal === "create") {
        if (!userId) {
          setErr("Select a user to link as responder.");
          return;
        }
        await opsFetchJson("/responders", tokens.accessToken, {
          method: "POST",
          body: JSON.stringify({
            userId,
            badgeNumber: badge.trim() || undefined,
            status,
            vehicleId: vehicleId || null,
          }),
        });
      } else if (modal === "edit" && editingId) {
        await opsFetchJson(`/responders/${editingId}`, tokens.accessToken, {
          method: "PATCH",
          body: JSON.stringify({
            badgeNumber: badge.trim() || null,
            status,
            vehicleId: vehicleId || null,
          }),
        });
      }
      setModal(null);
      await load();
    } catch (e: unknown) {
      setErr(e instanceof OpsApiError ? e.body?.slice(0, 240) ?? e.message : "Save failed");
    }
  }

  async function remove(id: string): Promise<void> {
    if (!tokens?.accessToken) return;
    if (!confirm("Remove responder profile and revert user to CITIZEN?")) return;
    try {
      await opsFetchJson(`/responders/${id}`, tokens.accessToken, { method: "DELETE" });
      await load();
    } catch (e: unknown) {
      setErr(e instanceof OpsApiError ? e.body?.slice(0, 240) ?? e.message : "Delete failed");
    }
  }

  if (!tokens?.accessToken) {
    return <p className="p-6 text-sm text-zinc-500">Sign in to manage responders.</p>;
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <OpsPanelCard title="Responder roster" subtitle="Field units, badges, and availability">
        <div className="mb-3 flex flex-wrap justify-between gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-200"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            Refresh
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-rose-600/90 px-3 py-1.5 text-xs font-semibold text-white"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Link responder
          </button>
        </div>
        {err ? <p className="mb-2 text-xs text-rose-300">{err}</p> : null}
        <div className="overflow-x-auto rounded-lg border border-white/[0.06]">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-black/40 text-[10px] uppercase text-zinc-500">
              <tr>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Badge</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Vehicle</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {rows.map((r) => (
                <tr key={r.id} className="text-zinc-200">
                  <td className="px-3 py-2">{r.user.email}</td>
                  <td className="px-3 py-2 font-mono text-zinc-400">{r.badgeNumber ?? "—"}</td>
                  <td className="px-3 py-2 text-amber-200/90">{r.status}</td>
                  <td className="px-3 py-2 font-mono text-zinc-500">{r.vehicle?.plateNumber ?? "—"}</td>
                  <td className="px-3 py-2 text-right">
                    <button type="button" onClick={() => openEdit(r)} className="mr-2 p-1 text-sky-300 hover:bg-white/10">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => void remove(r.id)} className="p-1 text-rose-300 hover:bg-white/10">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0c0c0f] p-5">
            <div className="mb-4 flex items-center gap-2 text-white">
              <Users className="h-5 w-5 text-rose-400" aria-hidden />
              <h2 className="text-sm font-semibold">{modal === "create" ? "Link responder" : "Edit responder"}</h2>
            </div>
            <div className="space-y-3">
              {modal === "create" ? (
                <label className="block text-[10px] uppercase text-zinc-500">
                  User account
                  <select
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white"
                  >
                    <option value="">— select —</option>
                    {users
                      .filter((u) => u.role === "CITIZEN" || u.role === "RESPONDER" || u.role === "OPERATOR")
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.email} ({u.role})
                        </option>
                      ))}
                  </select>
                </label>
              ) : (
                <p className="text-xs text-zinc-500">
                  User: <span className="text-zinc-200">{editEmail}</span>
                </p>
              )}
              <label className="block text-[10px] uppercase text-zinc-500">
                Badge
                <input
                  value={badge}
                  onChange={(e) => setBadge(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="block text-[10px] uppercase text-zinc-500">
                Status
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white"
                >
                  {RESPONDER_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-[10px] uppercase text-zinc-500">
                Vehicle (optional)
                <select
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white"
                >
                  <option value="">— none —</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plateNumber}
                    </option>
                  ))}
                </select>
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
