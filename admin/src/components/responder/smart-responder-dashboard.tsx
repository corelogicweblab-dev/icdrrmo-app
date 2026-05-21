"use client";

import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, MapPin, Phone, Stethoscope } from "lucide-react";
import { opsFetchJson } from "@/lib/ops-api";

type FieldDashboard = {
  configured: boolean;
  assignments: Array<{
    id: string;
    type: string;
    status: string;
    title: string | null;
    latitude: number;
    longitude: number;
    barangayName: string | null;
    routeUrl: string;
    citizenMedical: {
      fullName: string;
      bloodType: string;
      allergies: string | null;
      medicalConditions: string | null;
      phone: string | null;
      emergencyContacts: Array<{ fullName: string; phone: string }>;
    } | null;
  }>;
  performance: { resolved30d: number; resolutionRatePct: number; assigned30d: number };
  responder: { status: string; badgeNumber: string | null };
};

export function SmartResponderDashboard(props: { accessToken: string }): ReactElement {
  const [data, setData] = useState<FieldDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const d = await opsFetchJson<FieldDashboard>(
          "/responders/me/field-dashboard",
          props.accessToken,
        );
        if (!cancelled) setData(d);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [props.accessToken]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-orange-400" />
      </div>
    );
  }

  if (!data?.configured) {
    return (
      <p className="text-sm text-amber-200/90 p-4">
        Responder roster not linked — contact ops to assign your account.
      </p>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">SMART Responder Dashboard</h1>
        <p className="text-xs text-zinc-500 mt-1">
          Status: {data.responder.status}
          {data.responder.badgeNumber ? ` · Badge ${data.responder.badgeNumber}` : ""} · Resolved
          30d: {data.performance.resolved30d} ({data.performance.resolutionRatePct}%)
        </p>
      </div>

      <section className="rounded-2xl border border-orange-500/15 bg-black/30 p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-orange-400/90 mb-3">
          Live assignments
        </p>
        {data.assignments.length === 0 ? (
          <p className="text-xs text-zinc-500">No active assignments — stand by for dispatch.</p>
        ) : (
          <ul className="space-y-3">
            {data.assignments.map((a) => (
              <li
                key={a.id}
                className="rounded-xl border border-rose-500/20 bg-rose-950/15 p-3 text-xs"
              >
                <p className="font-semibold text-zinc-100">{a.title ?? a.type}</p>
                <p className="text-zinc-500 mt-0.5">
                  {a.status} · {a.barangayName ?? "—"}
                </p>
                <a
                  href={a.routeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-orange-300"
                >
                  <MapPin className="h-3.5 w-3.5" />
                  GPS route
                </a>
                {a.citizenMedical ? (
                  <div className="mt-3 border-t border-white/[0.06] pt-2 text-zinc-400">
                    <p className="flex items-center gap-1 text-zinc-300">
                      <Stethoscope className="h-3.5 w-3.5" />
                      {a.citizenMedical.fullName} · {a.citizenMedical.bloodType.replace(/_/g, " ")}
                    </p>
                    {a.citizenMedical.allergies ? (
                      <p className="mt-1">Allergies: {a.citizenMedical.allergies}</p>
                    ) : null}
                    {a.citizenMedical.phone ? (
                      <a
                        href={`tel:${a.citizenMedical.phone}`}
                        className="mt-1 inline-flex items-center gap-1 text-rose-300"
                      >
                        <Phone className="h-3 w-3" />
                        {a.citizenMedical.phone}
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/responder/map"
          className="rounded-2xl border border-orange-500/15 p-5 hover:border-orange-500/30"
        >
          <p className="text-sm font-medium text-white">Field map</p>
          <p className="text-[11px] text-zinc-500 mt-1">Windy weather + incident layers</p>
        </Link>
        <Link
          href="/responder/profile"
          className="rounded-2xl border border-orange-500/15 p-5 hover:border-orange-500/30"
        >
          <p className="text-sm font-medium text-white">Profile & medical</p>
          <p className="text-[11px] text-zinc-500 mt-1">Update availability and contacts</p>
        </Link>
      </div>
    </div>
  );
}
