"use client";

import type { ReactElement } from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IcdrrmoLogo } from "@/components/icdrrmo-logo";
import { getApiBaseUrl } from "@/lib/env";
import { clearOpsTokens, saveOpsTokens } from "@/components/ops/ops-storage";
import { decodeJwtPayload } from "@/lib/decode-jwt-role";

const ALLOW = new Set(["ADMIN", "SUPER_ADMIN", "OPERATOR"]);

export default function SigninAdminPage(): ReactElement {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json().catch(() => ({}))) as { accessToken?: string; message?: string };
      if (!res.ok) {
        setMsg(data.message ?? `Sign-in failed (${res.status})`);
        return;
      }
      if (!data.accessToken) {
        setMsg("Invalid response.");
        return;
      }
      const p = decodeJwtPayload(data.accessToken);
      if (!p?.role || !ALLOW.has(p.role)) {
        clearOpsTokens();
        setMsg("This portal is for administrator or operator (desk) accounts only.");
        return;
      }
      saveOpsTokens({ accessToken: data.accessToken });
      router.push("/ops");
    } catch {
      setMsg("Network error — check API URL and CORS.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#060608] text-zinc-100 px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-gradient-to-b from-rose-950/30 to-black/60 p-8 shadow-panel">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-black/40 ring-1 ring-white/10 p-0.5">
            <IcdrrmoLogo size={44} priority className="rounded-lg" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Admin &amp; desk sign-in</h1>
            <p className="text-[11px] text-zinc-500">Routes to the operations console after JWT issue.</p>
          </div>
        </div>
        <form onSubmit={(ev) => void onSubmit(ev)} className="space-y-4">
          <label className="block space-y-1.5 text-xs">
            <span className="text-zinc-500">Email</span>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 text-sm outline-none focus:border-rose-500/40"
              required
            />
          </label>
          <label className="block space-y-1.5 text-xs">
            <span className="text-zinc-500">Password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 text-sm outline-none focus:border-rose-500/40"
              required
            />
          </label>
          {msg ? <p className="text-xs text-rose-300">{msg}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-rose-600 py-2.5 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-50 transition-colors"
          >
            {busy ? "Signing in…" : "Enter command console"}
          </button>
        </form>
        <p className="mt-6 text-center text-[10px] text-zinc-600">
          <Link href="/signin/citizen" className="text-zinc-500 hover:text-zinc-300">
            Citizen portal
          </Link>
          {" · "}
          <Link href="/signin/responder" className="text-zinc-500 hover:text-zinc-300">
            Responder portal
          </Link>
        </p>
      </div>
      <p className="mt-8 text-[10px] text-zinc-600">Powered by: CoreLogic</p>
    </div>
  );
}
