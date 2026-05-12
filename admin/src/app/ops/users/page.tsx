"use client";

import type { ReactElement } from "react";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, RefreshCw, Users as UsersIcon } from "lucide-react";
import { useOpsSession } from "@/components/ops/ops-session-context";
import { OpsPanelCard } from "@/components/ops/ops-widgets";
import { opsFetchJson, OpsApiError } from "@/lib/ops-api";

type UserRow = {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  online?: boolean;
  profile?: { fullName: string; barangay?: { name: string } | null } | null;
};

type ListResponse = {
  items: UserRow[];
  total: number;
  page: number;
  limit: number;
};

export default function OpsUsersPage(): ReactElement {
  const { tokens } = useOpsSession();
  const [page, setPage] = useState(1);
  const [searchDraft, setSearchDraft] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [reloadNonce, setReloadNonce] = useState(0);
  const [role, setRole] = useState("");
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tokens?.accessToken) return;
    setLoading(true);
    setErr(null);
    try {
      const q = new URLSearchParams();
      q.set("page", String(page));
      q.set("limit", "15");
      if (appliedSearch.trim()) q.set("search", appliedSearch.trim());
      if (role) q.set("role", role);
      const res = await opsFetchJson<ListResponse>(`/users?${q.toString()}`, tokens.accessToken);
      setData(res);
    } catch (e: unknown) {
      setData(null);
      setErr(e instanceof OpsApiError ? `${e.message} — ${e.body?.slice(0, 200)}` : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [tokens?.accessToken, page, appliedSearch, role]);

  useEffect(() => {
    void load();
  }, [load, reloadNonce]);

  if (!tokens?.accessToken) {
    return (
      <div className="p-6 text-sm text-zinc-500">
        Sign in to the operations console to manage users.
      </div>
    );
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <OpsPanelCard title="Directory" subtitle="Search and paginate user accounts (administrator tools)">
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-[11px] text-zinc-500">
            Search email
            <input
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setAppliedSearch(searchDraft.trim());
                  setPage(1);
                  setReloadNonce((n) => n + 1);
                }
              }}
              className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-100 w-56"
              placeholder="fragment…"
            />
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-zinc-500">
            Role
            <select
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setPage(1);
                setReloadNonce((n) => n + 1);
              }}
              className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-100"
            >
              <option value="">All</option>
              <option value="CITIZEN">CITIZEN</option>
              <option value="RESPONDER">RESPONDER</option>
              <option value="OPERATOR">OPERATOR (dispatcher)</option>
              <option value="ADMIN">ADMIN</option>
              <option value="SUPER_ADMIN">SUPER_ADMIN</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => {
              setAppliedSearch(searchDraft.trim());
              setPage(1);
              setReloadNonce((n) => n + 1);
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-950/30 px-3 py-2 text-xs font-semibold text-rose-100 hover:bg-rose-950/50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />}
            Refresh
          </button>
        </div>
        {err ? (
          <p className="text-sm text-rose-300">{err}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-white/[0.06]">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-black/40 text-[10px] uppercase tracking-widest text-zinc-500">
                <tr>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">Barangay</th>
                  <th className="px-3 py-2">Active</th>
                  <th className="px-3 py-2">Online*</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-zinc-200">
                {(data?.items ?? []).map((u) => (
                  <tr key={u.id} className="hover:bg-white/[0.02]">
                    <td className="px-3 py-2 font-mono text-[11px]">{u.email}</td>
                    <td className="px-3 py-2">{u.profile?.fullName ?? "—"}</td>
                    <td className="px-3 py-2 text-rose-200/90">{u.role}</td>
                    <td className="px-3 py-2 text-zinc-400">{u.profile?.barangay?.name ?? "—"}</td>
                    <td className="px-3 py-2">{u.isActive ? "yes" : "no"}</td>
                    <td className="px-3 py-2">{u.online ? "likely" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500">
          <span className="inline-flex items-center gap-1">
            <UsersIcon className="h-3.5 w-3.5" aria-hidden />
            {data ? `${data.total} users · page ${data.page} / ${totalPages}` : ""}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded border border-white/10 px-2 py-1 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded border border-white/10 px-2 py-1 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
        <p className="mt-2 text-[10px] text-zinc-600">
          *Online heuristic: device token seen in the last 2 minutes. User create, update, and retire actions require an
          administrator account.
        </p>
      </OpsPanelCard>
    </div>
  );
}
