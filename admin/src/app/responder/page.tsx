"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { useResponderSession, isResponderRole } from "@/components/responder/responder-session-context";
import { SmartResponderDashboard } from "@/components/responder/smart-responder-dashboard";

export default function ResponderHomePage(): ReactElement {
  const { tokens } = useResponderSession();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (!tokens?.accessToken) {
      setAllowed(null);
      return;
    }
    setAllowed(isResponderRole(tokens.accessToken));
  }, [tokens?.accessToken]);

  if (!tokens?.accessToken) {
    return (
      <div className="p-8 max-w-md mx-auto text-center space-y-4">
        <p className="text-sm text-zinc-400">Sign in on the responder portal to load your dashboard.</p>
        <Link
          href="/"
          className="inline-block rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-500"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (allowed === false) {
    return (
      <div className="p-8 flex flex-col items-center gap-4 text-center max-w-lg mx-auto">
        <ShieldAlert className="h-12 w-12 text-amber-400" aria-hidden />
        <p className="text-sm text-zinc-300">This area is for responder accounts. Your token role does not match.</p>
        <Link href="/" className="text-xs text-orange-400 underline">
          Use a different account
        </Link>
      </div>
    );
  }

  return <SmartResponderDashboard accessToken={tokens.accessToken} />;
}
