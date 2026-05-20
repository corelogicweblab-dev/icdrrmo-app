"use client";

import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IcdAuthShell } from "@/components/icd-auth-shell";
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
    <IcdAuthShell title="Sign in" subtitle="Use the email and password issued for your role.">
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

      <form onSubmit={(ev) => void onSubmit(ev)} className="space-y-4">
        <label className="block space-y-1.5 text-xs">
          <span className="font-medium uppercase tracking-wider text-orange-400/80">Email</span>
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
          <span className="font-medium uppercase tracking-wider text-orange-400/80">Password</span>
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
        <button type="submit" disabled={busy} className="icd-btn-primary py-3">
          {busy ? "Signing in…" : "Continue"}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-zinc-500">
        New resident?{" "}
        <Link href="/citizen" className="icd-link">
          Create a citizen account
        </Link>
      </p>
    </IcdAuthShell>
  );
}
