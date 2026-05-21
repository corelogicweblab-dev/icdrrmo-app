"use client";

import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IcdAuthShell } from "@/components/icd-auth-shell";
import { PasswordInput } from "@/components/password-input";
import { fetchWithTimeout, pingApiHealth, type ApiReachability } from "@/lib/api-fetch";
import { getApiBaseUrl, getApiConfigWarning } from "@/lib/env";
import {
  dashboardPathForToken,
  loadCitizenTokens,
  loginWithRoleRouting,
  navigateAfterLogin,
  purgeInvalidStoredSessions,
} from "@/lib/unified-auth";
import { loadChairmanTokens } from "@/components/chairman/chairman-storage";
import { loadOpsTokens } from "@/components/ops/ops-storage";
import { IcdrrmoAiChat } from "@/components/ai/icdrrmo-ai-chat";
import { WEB_BUILD_ID } from "@/lib/web-build-id";

export function UnifiedLoginPage(): ReactElement {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [apiReach, setApiReach] = useState<ApiReachability | null>(null);
  const [checkingApi, setCheckingApi] = useState(true);
  const [oidcEnabled, setOidcEnabled] = useState(false);
  /** Avoid flashing the sign-in form before auto-redirect when a valid session exists. */
  const [sessionChecked, setSessionChecked] = useState(false);
  const apiWarning = getApiConfigWarning();

  useEffect(() => {
    purgeInvalidStoredSessions();
    const pairs = [
      loadCitizenTokens(),
      loadChairmanTokens(),
      loadOpsTokens(),
    ];
    for (const pair of pairs) {
      if (!pair?.accessToken) continue;
      const path = dashboardPathForToken(pair.accessToken);
      if (path) {
        router.replace(path);
        return;
      }
    }
    setSessionChecked(true);
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCheckingApi(true);
      const [result, oidc] = await Promise.all([
        pingApiHealth(),
        fetchWithTimeout(`${getApiBaseUrl()}/auth/oidc/status`)
          .then(async (r) => (r.ok ? ((await r.json()) as { enabled?: boolean }) : { enabled: false }))
          .catch(() => ({ enabled: false })),
      ]);
      if (!cancelled) {
        setApiReach(result);
        setOidcEnabled(Boolean(oidc.enabled));
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

  if (!sessionChecked) {
    return (
      <div className="icd-auth-page min-h-[100dvh] flex items-center justify-center text-sm text-zinc-500">
        Checking session…
      </div>
    );
  }

  return (
    <>
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
        <p className="mb-3 text-xs text-amber-200/90" role="alert">
          API waking up — first load may take ~60s on Render. {apiReach.message}
        </p>
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

      {oidcEnabled ? (
        <>
          <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-widest text-zinc-600">
            <span className="h-px flex-1 bg-orange-500/15" />
            or
            <span className="h-px flex-1 bg-orange-500/15" />
          </div>
          <a
            href={`${getApiBaseUrl()}/auth/oidc/login`}
            className="block w-full rounded-xl border border-orange-500/30 bg-zinc-900/60 py-3 text-center text-sm font-medium text-orange-100 hover:border-rose-500/40 hover:bg-zinc-900 transition"
          >
            Sign in with LGU identity (OIDC)
          </a>
        </>
      ) : null}

      <p className="mt-6 text-center text-xs text-zinc-500">
        New resident?{" "}
        <Link href="/citizen?register=1" className="icd-link">
          Create a citizen account
        </Link>
        {" · "}
        <Link href="/portals" className="icd-link text-zinc-600">
          Portal shortcuts
        </Link>
      </p>
      <p className="mt-3 text-center font-mono text-[9px] text-zinc-600" title="Firebase Hosting build">
        LIVE BUILD · Web build {WEB_BUILD_ID} · SMART dashboards + ICDRRMO AI
      </p>
    </IcdAuthShell>
    <IcdrrmoAiChat accessToken={null} portal="home" guestMode />
    </>
  );
}
