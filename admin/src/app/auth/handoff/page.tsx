"use client";

import type { ReactElement } from "react";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { saveChairmanTokens } from "@/components/chairman/chairman-storage";
import { saveOpsTokens } from "@/components/ops/ops-storage";
import { decodeJwtPayload } from "@/lib/decode-jwt-role";

/**
 * Mobile staff sign-in opens this URL with `#t=<Nest JWT>` so we can persist the same
 * `icdrrmo_ops_tokens` key the web responder/ops consoles already use.
 */
function HandoffBody(): ReactElement {
  const router = useRouter();
  const search = useSearchParams();
  const [note, setNote] = useState<string>("Opening console…");

  useEffect(() => {
    const targetRaw = search.get("target");
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const raw = hash.startsWith("#") ? hash.slice(1) : "";
    const params = new URLSearchParams(raw);
    const t = params.get("t");
    if (!t || !t.trim()) {
      setNote("Missing token. Return to the mobile app and sign in again.");
      return;
    }
    const accessToken = decodeURIComponent(t.trim());
    const role = decodeJwtPayload(accessToken)?.role;
    try {
      if (role === "BARANGAY_CHAIRMAN" || targetRaw === "chairman") {
        saveChairmanTokens({ accessToken });
      } else {
        saveOpsTokens({ accessToken });
      }
    } catch {
      setNote("Could not save session. Try signing in again on the web portal.");
      return;
    }
    const target =
      targetRaw === "chairman" || role === "BARANGAY_CHAIRMAN"
        ? "chairman"
        : targetRaw === "responder"
          ? "responder"
          : "ops";
    router.replace(target === "chairman" ? "/chairman" : target === "responder" ? "/responder" : "/ops");
  }, [router, search]);

  return (
    <div className="flex min-h-[50dvh] flex-col items-center justify-center bg-transparent px-6 text-center text-sm text-zinc-400">
      {note}
    </div>
  );
}

export default function AuthHandoffPage(): ReactElement {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40dvh] items-center justify-center bg-transparent text-sm text-zinc-500">
          Loading…
        </div>
      }
    >
      <HandoffBody />
    </Suspense>
  );
}
