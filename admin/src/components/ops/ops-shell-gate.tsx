"use client";

import type { ReactElement, ReactNode } from "react";
import { useEffect, useState } from "react";
import { IcdrrmoLogo } from "@/components/icdrrmo-logo";
import { useOpsSession } from "@/components/ops/ops-session-context";
import { canAccessOpsConsole } from "@/lib/decode-jwt-role";

export function OpsShellGate({ children }: { children: ReactNode }): ReactElement {
  const { tokens, logout } = useOpsSession();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (!tokens?.accessToken) {
      setAllowed(null);
      return;
    }
    setAllowed(canAccessOpsConsole(tokens.accessToken));
  }, [tokens?.accessToken]);

  if (!tokens?.accessToken) {
    return <>{children}</>;
  }
  if (allowed === false) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="rounded-2xl bg-black/40 p-2 ring-1 ring-rose-500/25">
          <IcdrrmoLogo size={80} className="rounded-xl opacity-90" />
        </div>
        <div className="max-w-md space-y-2">
          <h1 className="text-lg font-semibold text-white">Operations console restricted</h1>
          <p className="text-sm text-zinc-400 leading-relaxed">
            This EOC dashboard requires an <span className="text-zinc-200">ADMIN</span>,{" "}
            <span className="text-zinc-200">SUPER_ADMIN</span>, or <span className="text-zinc-200">OPERATOR</span>{" "}
            (dispatcher) account. Citizen and responder accounts cannot open this area.
          </p>
        </div>
        <button
          type="button"
          onClick={() => logout()}
          className="rounded-lg border border-white/10 bg-white/[0.06] px-4 py-2 text-sm text-zinc-100 hover:bg-white/[0.1]"
        >
          Sign out
        </button>
      </div>
    );
  }
  return <>{children}</>;
}
