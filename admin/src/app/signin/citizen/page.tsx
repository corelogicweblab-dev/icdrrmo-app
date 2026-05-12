"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import { IcdrrmoLogo } from "@/components/icdrrmo-logo";

export default function SigninCitizenPage(): ReactElement {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-transparent text-zinc-100 px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-zinc-950/80 p-8 text-center space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-black/35 ring-1 ring-white/10 p-1">
          <IcdrrmoLogo size={56} priority className="rounded-xl" />
        </div>
        <h1 className="text-lg font-semibold">Citizen access</h1>
        <p className="text-sm text-zinc-400 leading-relaxed">
          Registration and SOS reporting live on the citizen home page. Continue there to sign in or create an account.
        </p>
        <Link
          href="/citizen"
          className="inline-flex rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors"
        >
          Go to citizen portal
        </Link>
        <p className="text-[10px] text-zinc-600 pt-4">
          <Link href="/signin/operator" className="text-zinc-500 hover:text-zinc-300">
            Operator / desk
          </Link>
          {" · "}
          <Link href="/signin/responder" className="text-zinc-500 hover:text-zinc-300">
            Responder
          </Link>
        </p>
      </div>
      <p className="mt-8 text-[10px] text-zinc-600">Powered by: CoreLogic</p>
    </div>
  );
}
