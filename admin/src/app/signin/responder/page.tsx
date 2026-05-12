"use client";

import type { ReactElement } from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IcdrrmoLogo } from "@/components/icdrrmo-logo";
import { PasswordInput } from "@/components/password-input";
import { clearOpsTokens } from "@/components/ops/ops-storage";
import { responderLogin, isResponderRole } from "@/components/responder/responder-session-context";

export default function SigninResponderPage(): ReactElement {
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
      const pair = await responderLogin(email, password);
      if (!isResponderRole(pair.accessToken)) {
        clearOpsTokens();
        setMsg("This account is not a responder. Use admin/citizen sign-in instead.");
        return;
      }
      router.push("/responder");
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-transparent text-zinc-100 px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-gradient-to-b from-sky-950/35 to-black/60 p-8 shadow-panel">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-black/40 ring-1 ring-white/10 p-0.5">
            <IcdrrmoLogo size={44} priority className="rounded-lg" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Responder sign-in</h1>
            <p className="text-[11px] text-zinc-500">Field map and profile (JWT access only).</p>
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
              className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 text-sm outline-none focus:border-sky-500/40"
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
              className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 text-sm outline-none focus:border-sky-500/40"
              required
            />
          </label>
          {msg ? <p className="text-xs text-rose-300">{msg}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-sky-600 py-2.5 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50 transition-colors"
          >
            {busy ? "Signing in…" : "Open responder console"}
          </button>
        </form>
        <p className="mt-6 text-center text-[10px] text-zinc-600">
          <Link href="/signin/operator" className="text-zinc-500 hover:text-zinc-300">
            Operator / desk
          </Link>
          {" · "}
          <Link href="/signin/citizen" className="text-zinc-500 hover:text-zinc-300">
            Citizen
          </Link>
        </p>
      </div>
      <p className="mt-8 text-[10px] text-zinc-600">Powered by: CoreLogic</p>
    </div>
  );
}
