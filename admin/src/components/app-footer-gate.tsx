"use client";

import type { ReactElement } from "react";
import { usePathname } from "next/navigation";

/** Portal routes render their own footer — avoid duplicate “Powered by: CoreLogic”. */
function hideGlobalFooter(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    pathname.startsWith("/citizen") ||
    pathname.startsWith("/responder") ||
    pathname.startsWith("/chairman") ||
    pathname.startsWith("/ops")
  );
}

export function AppFooterGate(): ReactElement | null {
  const pathname = usePathname();
  if (hideGlobalFooter(pathname)) return null;
  return (
    <footer className="icd-app-footer py-2.5 text-center text-[11px] tracking-wide text-zinc-500">
      <span className="icd-text-safe text-orange-400/80">Powered by: CoreLogic</span>
    </footer>
  );
}
