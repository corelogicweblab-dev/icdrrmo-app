"use client";

import type { ReactElement } from "react";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, LocateFixed, Save } from "lucide-react";
import { BarangayUserProfileCard } from "@/components/barangay-user-profile-card";
import { opsApiErrorUserMessage, opsFetchJson, OpsApiError } from "@/lib/ops-api";

type Tokens = { accessToken: string };

const STORAGE = "icdrrmo_citizen_tokens";

function loadTokens(): Tokens | null {
  try {
    const raw = localStorage.getItem(STORAGE);
    if (!raw) return null;
    const x = JSON.parse(raw) as Tokens;
    return typeof x.accessToken === "string" ? x : null;
  } catch {
    return null;
  }
}

type MeUser = {
  email: string;
  phone: string | null;
  profile: null | {
    fullName: string;
    barangayId: string | null;
    barangay?: { id: string; name: string; code: string } | null;
    address: string | null;
    streetPurok: string | null;
    bloodType: string;
    allergies: string | null;
    medicalConditions: string | null;
    availabilityStatus: string;
  };
  notifications: Array<{ id: string; title: string; body: string; createdAt: string }>;
};

type EvacRow = {
  id: string;
  name: string;
  occupancy: number;
  capacity: number | null;
  distanceKm?: number;
};

const BLOOD = [
  "UNKNOWN",
  "A_POS",
  "A_NEG",
  "B_POS",
  "B_NEG",
  "O_POS",
  "O_NEG",
  "AB_POS",
  "AB_NEG",
] as const;

export default function CitizenProfilePage(): ReactElement {
  const [tokens] = useState<Tokens | null>(() => (typeof window === "undefined" ? null : loadTokens()));
  const [me, setMe] = useState<MeUser | null>(null);
  const [nearest, setNearest] = useState<EvacRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [geoBusy, setGeoBusy] = useState(false);
  const [bloodType, setBloodType] = useState("UNKNOWN");
  const [allergies, setAllergies] = useState("");
  const [medicalConditions, setMedicalConditions] = useState("");
  const [medBusy, setMedBusy] = useState(false);

  const load = useCallback(async () => {
    const t = loadTokens();
    if (!t) return;
    setErr(null);
    try {
      const u = await opsFetchJson<MeUser>("/users/me", t.accessToken);
      setMe(u);
      if (u.profile) {
        setBloodType(u.profile.bloodType ?? "UNKNOWN");
        setAllergies(u.profile.allergies ?? "");
        setMedicalConditions(u.profile.medicalConditions ?? "");
      }
      const ev = await opsFetchJson<EvacRow[]>(`/evacuation-centers/nearest`, t.accessToken);
      setNearest(Array.isArray(ev) ? ev : []);
    } catch (e: unknown) {
      setErr(e instanceof OpsApiError ? opsApiErrorUserMessage(e) : "Failed to load");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function refreshNearestWithGps(): Promise<void> {
    const t = loadTokens();
    if (!t) return;
    setGeoBusy(true);
    setErr(null);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 12_000 });
      });
      const la = pos.coords.latitude;
      const lo = pos.coords.longitude;
      const ev = await opsFetchJson<EvacRow[]>(
        `/evacuation-centers/nearest?lat=${encodeURIComponent(String(la))}&lng=${encodeURIComponent(String(lo))}`,
        t.accessToken,
      );
      setNearest(Array.isArray(ev) ? ev : []);
    } catch {
      setErr("Could not read GPS or load nearest sites.");
    } finally {
      setGeoBusy(false);
    }
  }

  async function onSaveMedical(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    const t = loadTokens();
    if (!t) return;
    setMedBusy(true);
    setErr(null);
    try {
      await opsFetchJson("/users/me", t.accessToken, {
        method: "PATCH",
        body: JSON.stringify({
          bloodType,
          allergies: allergies.trim() || null,
          medicalConditions: medicalConditions.trim() || null,
        }),
      });
      void load();
    } catch (e: unknown) {
      setErr(e instanceof OpsApiError ? opsApiErrorUserMessage(e, 200) : "Save failed");
    } finally {
      setMedBusy(false);
    }
  }

  if (!tokens) {
    return (
      <div className="min-h-[100dvh] bg-transparent text-zinc-100 p-8 text-center">
        <p className="text-sm text-zinc-400 mb-4">Sign in from the citizen home page first.</p>
        <Link href="/citizen" className="text-rose-400 text-sm underline">
          Citizen portal
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-transparent text-zinc-100">
      <header className="sticky top-0 z-20 border-b border-orange-500/12 bg-black/50 backdrop-blur-lg px-4 py-3 flex items-center justify-between">
        <Link href="/citizen" className="inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back
        </Link>
        <span className="text-[10px] font-bold uppercase tracking-widest text-rose-300/90">Profile</span>
        <span className="w-16" />
      </header>
      <main className="mx-auto max-w-lg px-4 py-6 space-y-6 pb-12">
        {err ? <p className="text-sm text-rose-300">{err}</p> : null}
        {!me ? (
          <Loader2 className="h-6 w-6 animate-spin text-zinc-500 mx-auto" aria-hidden />
        ) : (
          <>
            <BarangayUserProfileCard accessToken={tokens.accessToken} requireBarangay />

            <form onSubmit={(ev) => void onSaveMedical(ev)} className="rounded-2xl icd-surface p-5 space-y-4">
              <h2 className="text-sm font-semibold text-white">Medical details</h2>
              <label className="block space-y-1 text-xs">
                <span className="text-zinc-500">Blood type</span>
                <select
                  value={bloodType}
                  onChange={(e) => setBloodType(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-black/40 px-3 py-2.5 text-sm"
                >
                  {BLOOD.map((b) => (
                    <option key={b} value={b}>
                      {b.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1 text-xs">
                <span className="text-zinc-500">Allergies</span>
                <textarea
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-zinc-700 bg-black/40 px-3 py-2.5 text-sm"
                />
              </label>
              <label className="block space-y-1 text-xs">
                <span className="text-zinc-500">Medical</span>
                <textarea
                  value={medicalConditions}
                  onChange={(e) => setMedicalConditions(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-zinc-700 bg-black/40 px-3 py-2.5 text-sm"
                />
              </label>
              <button
                type="submit"
                disabled={medBusy}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {medBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save medical details
              </button>
            </form>

            <section className="rounded-2xl icd-surface p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-white">Evacuation centers</h2>
                <button
                  type="button"
                  onClick={() => void refreshNearestWithGps()}
                  disabled={geoBusy}
                  className="inline-flex items-center gap-1 rounded-lg border border-orange-500/20 px-2 py-1 text-[10px] text-zinc-300 disabled:opacity-50"
                >
                  <LocateFixed className="h-3.5 w-3.5" aria-hidden />
                  {geoBusy ? "…" : "Sort by GPS"}
                </button>
              </div>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Nearest evacuation centers for your registered barangay.
              </p>
              <ul className="space-y-2 text-xs">
                {nearest.length ? (
                  nearest.map((e) => (
                    <li key={e.id} className="rounded-lg border border-orange-500/12 bg-black/30 px-3 py-2">
                      <span className="font-medium text-zinc-200">{e.name}</span>
                      <span className="block text-zinc-500 mt-0.5">
                        Occupancy {e.occupancy}
                        {e.capacity != null ? ` / ${e.capacity}` : ""}
                        {e.distanceKm != null ? ` · ${e.distanceKm.toFixed(1)} km` : ""}
                      </span>
                    </li>
                  ))
                ) : (
                  <li className="text-zinc-600">Set your barangay on the profile to see centers.</li>
                )}
              </ul>
            </section>

            <section className="rounded-2xl icd-surface p-5">
              <h2 className="text-sm font-semibold text-white mb-3">Recent alerts</h2>
              <ul className="space-y-2 text-xs text-zinc-400 max-h-56 overflow-y-auto">
                {me.notifications?.length ? (
                  me.notifications.map((n) => (
                    <li key={n.id} className="border-l-2 border-rose-500/40 pl-2">
                      <span className="text-zinc-200">{n.title}</span>
                      <p className="mt-0.5">{n.body}</p>
                    </li>
                  ))
                ) : (
                  <li className="text-zinc-600">No alerts yet.</li>
                )}
              </ul>
            </section>
          </>
        )}
      </main>
      <footer className="py-4 text-center text-[10px] text-zinc-600">Powered by: CoreLogic</footer>
    </div>
  );
}
