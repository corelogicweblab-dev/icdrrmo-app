"use client";

import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IcdrrmoLogo } from "@/components/icdrrmo-logo";
import { PasswordInput } from "@/components/password-input";
import { pingApiHealth, type ApiReachability } from "@/lib/api-fetch";
import { getApiConfigWarning } from "@/lib/env";
import {
  dashboardPathForToken,
  loadCitizenTokens,
  loginWithRoleRouting,
  navigateAfterLogin,
  purgeInvalidStoredSessions,
} from "@/lib/unified-auth";
import { loadChairmanTokens } from "@/components/chairman/chairman-storage";
import { loadOpsTokens } from "@/components/ops/ops-storage";

export function UnifiedLoginPage(): ReactElement {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [apiReach, setApiReach] = useState<ApiReachability | null>(null);
  const [checkingApi, setCheckingApi] = useState(true);
  const apiWarning = getApiConfigWarning();

  useEffect(() => {
    purgeInvalidStoredSessions();
    const citizen = loadCitizenTokens();
    if (citizen?.accessToken) {
      const path = dashboardPathForToken(citizen.accessToken);
      if (path) {
        router.replace(path);
        return;
      }
    }
    const chairman = loadChairmanTokens();
    if (chairman?.accessToken) {
      const path = dashboardPathForToken(chairman.accessToken);
      if (path) {
        router.replace(path);
        return;
      }
    }
    const ops = loadOpsTokens();
    if (ops?.accessToken) {
      const path = dashboardPathForToken(ops.accessToken);
      if (path) {
        router.replace(path);
      }
    }
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCheckingApi(true);
      const result = await pingApiHealth();
      if (!cancelled) {
        setApiReach(result);
        setCheckingApi(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
      if (apiReach && !apiReach.ok) {
        const again = await pingApiHealth(8_000);
        setApiReach(again);
        if (!again.ok) {
          setMsg(again.message);
          return;
        }
      }

      const result = await loginWithRoleRouting(email, password);
      if (!result.ok) {
        setMsg(result.message);
        return;
      }
      router.replace(result.redirectTo);
      navigateAfterLogin(result.redirectTo);
    } catch {
      setMsg("Unexpected error during sign-in. Refresh the page and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-transparent text-zinc-100">
      <header className="icd-header-bar">
        <div className="mx-auto flex max-w-md flex-col gap-5 px-5 py-10 text-center md:py-12">
          <div className="mx-auto flex h-24 w-24 items-center justify-center icd-logo-ring p-2">
            <IcdrrmoLogo size={88} priority className="h-full w-full object-contain" />
          </div>
          <div>
            <p className="icd-eyebrow">Isabela City · Basilan</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white icd-text-safe">
              ICDRRMO SMART Emergency Response
            </h1>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-zinc-400">
              One sign-in for all roles. After login you are sent to the citizen portal, responder console, or
              operations desk based on your account.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-8">
        {apiWarning ? (
          <div
            className="mb-4 rounded-xl border border-amber-500/30 bg-amber-950/40 px-4 py-3 text-sm text-amber-50"
            role="status"
          >
            {apiWarning}
          </div>
        ) : null}

        {!checkingApi && apiReach && !apiReach.ok ? (
          <div
            className="mb-4 rounded-xl border border-rose-500/35 bg-rose-950/45 px-4 py-3 text-sm text-rose-100"
            role="alert"
          >
            <p className="font-medium">Backend offline</p>
            <p className="mt-1 text-rose-200/90">{apiReach.message}</p>
          </div>
        ) : null}

        <div className="icd-surface p-7 shadow-panel">
          <h2 className="text-lg font-semibold text-white">Sign in</h2>
          <p className="mt-1 text-xs text-zinc-500">Use the email and password issued for your role.</p>

          <form onSubmit={(ev) => void onSubmit(ev)} className="mt-6 space-y-4">
            <label className="block space-y-1.5 text-xs">
              <span className="text-zinc-500">Email</span>
              <input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="icd-input"
                required
              />
            </label>
            <label className="block space-y-1.5 text-xs">
              <span className="text-zinc-500">Password</span>
              <PasswordInput
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                inputClassName="icd-input"
                required
              />
            </label>
            {msg ? (
              <p className="text-xs text-rose-300" role="alert">
                {msg}
              </p>
            ) : null}
            <button type="submit" disabled={busy} className="icd-btn-primary">
              {busy ? "Signing in…" : "Continue"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-zinc-500">
            New resident?{" "}
            <Link href="/citizen" className="icd-link">
              Create a citizen account
            </Link>
          </p>
        </div>

        <p className="mt-8 text-center text-[11px] uppercase tracking-[0.2em] text-zinc-600">
          Authorized use only · audited access
        </p>
      </main>
    </div>
  );
}
