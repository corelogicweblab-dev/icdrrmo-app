"use client";

import type { ReactElement } from "react";
import { useCallback, useEffect, useState } from "react";
import { Bell, Loader2, Mail, Megaphone, RefreshCw, Send, Smartphone } from "lucide-react";
import { useOpsSession } from "@/components/ops/ops-session-context";
import { OpsPanelCard } from "@/components/ops/ops-widgets";
import { opsFetchJson, OpsApiError } from "@/lib/ops-api";
import { jwtRole } from "@/lib/ops-jwt";

const NOTIFICATION_TYPES = [
  "EMERGENCY_ALERT",
  "WEATHER_ALERT",
  "EVACUATION",
  "RESPONDER_UPDATE",
  "SYSTEM",
] as const;

type NotifRow = {
  id: string;
  title: string;
  body: string;
  type: string;
  createdAt: string;
  user?: { id: string; email: string };
};

function parseUserIds(raw: string): string[] {
  return raw
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function OpsNotificationsPage(): ReactElement {
  const { tokens } = useOpsSession();
  const role = jwtRole(tokens?.accessToken);
  const canAdminAlerts = role === "ADMIN" || role === "SUPER_ADMIN";

  const [list, setList] = useState<NotifRow[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listErr, setListErr] = useState<string | null>(null);

  const [broadcastUserIds, setBroadcastUserIds] = useState("");
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastBody, setBroadcastBody] = useState("");
  const [broadcastType, setBroadcastType] = useState<string>("SYSTEM");
  const [broadcastMsg, setBroadcastMsg] = useState<string | null>(null);
  const [broadcastBusy, setBroadcastBusy] = useState(false);

  const [smsPhone, setSmsPhone] = useState("");
  const [smsMessage, setSmsMessage] = useState("");
  const [smsMsg, setSmsMsg] = useState<string | null>(null);
  const [smsBusy, setSmsBusy] = useState(false);

  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailText, setEmailText] = useState("");
  const [emailMsg, setEmailMsg] = useState<string | null>(null);
  const [emailBusy, setEmailBusy] = useState(false);

  const loadList = useCallback(async () => {
    if (!tokens?.accessToken) return;
    setListLoading(true);
    setListErr(null);
    try {
      const data = await opsFetchJson<NotifRow[]>("/notifications", tokens.accessToken);
      setList(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      setListErr(e instanceof OpsApiError ? e.body?.slice(0, 240) ?? e.message : "Failed to load");
    } finally {
      setListLoading(false);
    }
  }, [tokens?.accessToken]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  async function submitBroadcast(): Promise<void> {
    if (!tokens?.accessToken || !canAdminAlerts) return;
    const userIds = parseUserIds(broadcastUserIds);
    if (userIds.length === 0 || !broadcastTitle.trim() || !broadcastBody.trim()) {
      setBroadcastMsg("Provide at least one user ID, title, and body.");
      return;
    }
    setBroadcastBusy(true);
    setBroadcastMsg(null);
    try {
      const res = await opsFetchJson<{ created?: number }>("/notifications/broadcast", tokens.accessToken, {
        method: "POST",
        body: JSON.stringify({
          userIds,
          title: broadcastTitle.trim(),
          body: broadcastBody.trim(),
          type: broadcastType,
        }),
      });
      setBroadcastMsg(`Created ${res.created ?? userIds.length} in-app notification(s).`);
      void loadList();
    } catch (e: unknown) {
      setBroadcastMsg(e instanceof OpsApiError ? e.body?.slice(0, 280) ?? e.message : "Request failed");
    } finally {
      setBroadcastBusy(false);
    }
  }

  async function submitSms(): Promise<void> {
    if (!tokens?.accessToken || !canAdminAlerts) return;
    setSmsBusy(true);
    setSmsMsg(null);
    try {
      const res = await opsFetchJson<{ queued?: boolean; note?: string }>("/alerts/sms", tokens.accessToken, {
        method: "POST",
        body: JSON.stringify({
          toPhone: smsPhone.trim().replace(/\s+/g, ""),
          message: smsMessage.trim(),
        }),
      });
      const q = res.queued === true ? "Queued for worker." : "Not queued.";
      setSmsMsg(res.note ? `${q} ${res.note}` : `${q}`);
    } catch (e: unknown) {
      setSmsMsg(e instanceof OpsApiError ? e.body?.slice(0, 280) ?? e.message : "Request failed");
    } finally {
      setSmsBusy(false);
    }
  }

  async function submitEmail(): Promise<void> {
    if (!tokens?.accessToken || !canAdminAlerts) return;
    setEmailBusy(true);
    setEmailMsg(null);
    try {
      const er = await opsFetchJson<{ sent?: boolean; messageId?: string; note?: string }>("/alerts/email", tokens.accessToken, {
        method: "POST",
        body: JSON.stringify({
          to: emailTo.trim(),
          subject: emailSubject.trim(),
          text: emailText.trim(),
        }),
      });
      setEmailMsg(
        er.sent
          ? `Sent${er.messageId ? ` · ${er.messageId}` : ""}.`
          : er.note ?? "Email not sent.",
      );
    } catch (e: unknown) {
      setEmailMsg(e instanceof OpsApiError ? e.body?.slice(0, 280) ?? e.message : "Request failed");
    } finally {
      setEmailBusy(false);
    }
  }

  return (
    <div className="p-4 lg:p-6 grid gap-4 lg:grid-cols-12">
      <OpsPanelCard title="In-app broadcast" subtitle="POST /notifications/broadcast — targets user IDs" className="lg:col-span-6">
        {!canAdminAlerts ? (
          <p className="text-sm text-zinc-500">Admin or Super Admin role required for broadcast and direct SMS/email.</p>
        ) : (
          <div className="space-y-3">
            <label className="block text-[10px] uppercase tracking-wider text-zinc-500">
              User IDs (comma or newline separated)
              <textarea
                value={broadcastUserIds}
                onChange={(e) => setBroadcastUserIds(e.target.value)}
                placeholder="cuid1, cuid2 …"
                className="mt-1 min-h-[72px] w-full rounded-lg border border-zinc-800 bg-black/40 px-3 py-2 font-mono text-xs text-white outline-none focus:border-rose-500/40"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-[10px] uppercase tracking-wider text-zinc-500">
                Title
                <input
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-rose-500/40"
                />
              </label>
              <label className="block text-[10px] uppercase tracking-wider text-zinc-500">
                Type
                <select
                  value={broadcastType}
                  onChange={(e) => setBroadcastType(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-rose-500/40"
                >
                  {NOTIFICATION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block text-[10px] uppercase tracking-wider text-zinc-500">
              Body
              <textarea
                value={broadcastBody}
                onChange={(e) => setBroadcastBody(e.target.value)}
                className="mt-1 min-h-[120px] w-full rounded-lg border border-zinc-800 bg-black/40 p-3 text-sm text-white outline-none focus:border-rose-500/40"
              />
            </label>
            <button
              type="button"
              disabled={broadcastBusy}
              onClick={() => void submitBroadcast()}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600/85 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-40"
            >
              {broadcastBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Megaphone className="h-4 w-4" aria-hidden />}
              Send broadcast
            </button>
            {broadcastMsg ? <p className="text-xs text-zinc-400">{broadcastMsg}</p> : null}
          </div>
        )}
      </OpsPanelCard>

      <OpsPanelCard title="SMS alert" subtitle="POST /alerts/sms — queued when Redis is configured" className="lg:col-span-3">
        {!canAdminAlerts ? (
          <p className="text-sm text-zinc-500">Admin role required.</p>
        ) : (
          <div className="space-y-3">
            <label className="block text-[10px] uppercase tracking-wider text-zinc-500">
              E.164-style number
              <input
                value={smsPhone}
                onChange={(e) => setSmsPhone(e.target.value)}
                placeholder="+639171234567"
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-black/40 px-3 py-2 font-mono text-sm text-white outline-none focus:border-rose-500/40"
              />
            </label>
            <label className="block text-[10px] uppercase tracking-wider text-zinc-500">
              Message (max 480)
              <textarea
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
                maxLength={480}
                className="mt-1 min-h-[100px] w-full rounded-lg border border-zinc-800 bg-black/40 p-2 text-sm text-white outline-none focus:border-rose-500/40"
              />
            </label>
            <button
              type="button"
              disabled={smsBusy}
              onClick={() => void submitSms()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2 text-xs font-semibold text-white hover:bg-white/[0.1] disabled:opacity-40"
            >
              {smsBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Smartphone className="h-4 w-4" aria-hidden />}
              Queue SMS
            </button>
            {smsMsg ? <p className="text-xs text-zinc-400">{smsMsg}</p> : null}
          </div>
        )}
      </OpsPanelCard>

      <OpsPanelCard title="Email alert" subtitle="POST /alerts/email — SMTP from API env" className="lg:col-span-3">
        {!canAdminAlerts ? (
          <p className="text-sm text-zinc-500">Admin role required.</p>
        ) : (
          <div className="space-y-3">
            <label className="block text-[10px] uppercase tracking-wider text-zinc-500">
              To
              <input
                type="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-rose-500/40"
              />
            </label>
            <label className="block text-[10px] uppercase tracking-wider text-zinc-500">
              Subject
              <input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-rose-500/40"
              />
            </label>
            <label className="block text-[10px] uppercase tracking-wider text-zinc-500">
              Body (plain text)
              <textarea
                value={emailText}
                onChange={(e) => setEmailText(e.target.value)}
                className="mt-1 min-h-[100px] w-full rounded-lg border border-zinc-800 bg-black/40 p-2 text-sm text-white outline-none focus:border-rose-500/40"
              />
            </label>
            <button
              type="button"
              disabled={emailBusy}
              onClick={() => void submitEmail()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-950/30 px-4 py-2 text-xs font-semibold text-amber-100 hover:bg-amber-950/50 disabled:opacity-40"
            >
              {emailBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Mail className="h-4 w-4" aria-hidden />}
              Send email
            </button>
            {emailMsg ? <p className="text-xs text-zinc-400">{emailMsg}</p> : null}
          </div>
        )}
      </OpsPanelCard>

      <OpsPanelCard title="Recent notifications" subtitle="GET /notifications" className="lg:col-span-12">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-[11px] text-zinc-500">Latest rows from the database (all roles with ops access).</p>
          <button
            type="button"
            onClick={() => void loadList()}
            disabled={listLoading || !tokens?.accessToken}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-300 hover:bg-white/[0.06] disabled:opacity-40"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${listLoading ? "animate-spin" : ""}`} aria-hidden />
            Refresh
          </button>
        </div>
        {listErr ? <p className="text-xs text-rose-400/90">{listErr}</p> : null}
        <ul className="max-h-[320px] space-y-2 overflow-y-auto scroll-ops text-sm">
          {list.map((n) => (
            <li
              key={n.id}
              className="rounded-lg border border-white/[0.06] bg-black/30 px-3 py-2 text-zinc-300"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium text-white">{n.title}</span>
                <span className="font-mono text-[10px] text-zinc-500">{n.type}</span>
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{n.body}</p>
              <p className="mt-1 text-[10px] text-zinc-600">
                {n.user?.email ?? "—"} · {new Date(n.createdAt).toLocaleString()}
              </p>
            </li>
          ))}
          {!listLoading && list.length === 0 ? (
            <li className="text-xs text-zinc-600">No notifications yet.</li>
          ) : null}
        </ul>
      </OpsPanelCard>

      <OpsPanelCard title="Channels" subtitle="Operational notes" className="lg:col-span-12">
        <ul className="space-y-3 text-sm text-zinc-400">
          <li className="flex gap-2">
            <Bell className="h-5 w-5 text-rose-400 shrink-0" aria-hidden />
            In-app broadcast creates per-user notification rows; mobile clients should poll or subscribe when wired.
          </li>
          <li className="flex gap-2">
            <Send className="h-5 w-5 text-sky-400 shrink-0" aria-hidden />
            SMS uses the API job queue when <span className="font-mono text-zinc-500">REDIS_URL</span> and workers are running.
          </li>
          <li className="flex gap-2">
            <Mail className="h-5 w-5 text-amber-400 shrink-0" aria-hidden />
            Email requires SMTP variables on the API host (see backend env).
          </li>
        </ul>
      </OpsPanelCard>
    </div>
  );
}
