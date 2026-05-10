"use client";

import type { ReactElement } from "react";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  LocateFixed,
  Loader2,
  Lock,
  LogOut,
  UserCircle,
  UserPlus,
} from "lucide-react";
import { IcdrrmoLogo } from "@/components/icdrrmo-logo";
import { PasswordInput } from "@/components/password-input";
import { CitizenSosRouteCard } from "@/components/citizen-sos-route-card";
import { getApiBaseUrl, getApiConfigWarning } from "@/lib/env";
import { opsFetchJson, OpsApiError } from "@/lib/ops-api";

type Tokens = { accessToken: string; refreshToken?: string };

const STORAGE = "icdrrmo_citizen_tokens";

const SOS_TYPES = [
  { id: "FIRE", label: "Fire" },
  { id: "FLOOD", label: "Flood" },
  { id: "LANDSLIDE", label: "Landslide" },
  { id: "MEDICAL_EMERGENCY", label: "Medical emergency" },
  { id: "ACCIDENT", label: "Accident" },
  { id: "CRIME", label: "Crime / violence" },
  { id: "EARTHQUAKE", label: "Earthquake" },
  { id: "TYPHOON", label: "Typhoon / severe weather" },
  { id: "RESCUE_REQUEST", label: "Rescue request" },
  { id: "OTHER", label: "Other emergency" },
] as const;

function saveTokens(p: Tokens): void {
  localStorage.setItem(STORAGE, JSON.stringify(p));
}

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

type CitizenMe = {
  email: string;
  phone: string | null;
  role: string;
  profile: null | {
    fullName: string;
    barangayId: string | null;
    streetPurok: string | null;
    address: string | null;
    bloodType: string;
    allergies: string | null;
    medicalConditions: string | null;
    availabilityStatus: string;
    barangay: { name: string } | null;
  };
};

type PublicBarangay = { id: string; name: string; code: string };

type SosPanelState = {
  incidentId: string;
  deduplicated: boolean;
  userLat: number;
  userLon: number;
  emergencyLabel: string;
};

export default function CitizenPage(): ReactElement {
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [tokens, setTokens] = useState<Tokens | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("+639");
  const [registerBarangayId, setRegisterBarangayId] = useState("");
  const [registerStreetPurok, setRegisterStreetPurok] = useState("");
  const [registerBarangays, setRegisterBarangays] = useState<PublicBarangay[]>([]);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [lat, setLat] = useState<number | null>(null);
  const [lon, setLon] = useState<number | null>(null);
  const [geoBusy, setGeoBusy] = useState(false);
  const [kind, setKind] = useState<(typeof SOS_TYPES)[number]["id"]>("MEDICAL_EMERGENCY");
  const [sosBusy, setSosBusy] = useState(false);
  const [sosPanel, setSosPanel] = useState<SosPanelState | null>(null);

  const [me, setMe] = useState<CitizenMe | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileErr, setProfileErr] = useState<string | null>(null);

  useEffect(() => {
    setTokens(loadTokens());
  }, []);

  useEffect(() => {
    if (mode !== "register") return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${getApiBaseUrl()}/barangays/public`);
        const j = (await res.json()) as unknown;
        if (cancelled || !Array.isArray(j)) return;
        setRegisterBarangays(
          j.filter((x): x is PublicBarangay => {
            const o = x as Record<string, unknown>;
            return typeof o?.id === "string" && typeof o?.name === "string";
          }),
        );
      } catch {
        if (!cancelled) setRegisterBarangays([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode]);

  useEffect(() => {
    const t = tokens?.accessToken;
    if (!t) {
      setMe(null);
      setProfileErr(null);
      return;
    }
    let cancelled = false;
    setProfileLoading(true);
    setProfileErr(null);
    (async () => {
      try {
        const u = await opsFetchJson<CitizenMe>("/users/me", t);
        if (!cancelled) setMe(u);
      } catch (e: unknown) {
        if (!cancelled) {
          const hint =
            e instanceof OpsApiError && e.status === 404
              ? " (API path not found — set NEXT_PUBLIC_API_URL at build time to your Nest server.)"
              : "";
          setProfileErr(
            e instanceof OpsApiError ? `${e.message}${hint}` : "Could not load profile. Check the API URL.",
          );
          setMe(null);
        }
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tokens?.accessToken]);

  async function login(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json().catch(() => ({}))) as Partial<Tokens> & { message?: string };
      if (!res.ok) {
        setMsg(data.message ?? `Cannot sign in (${res.status}).`);
        return;
      }
      if (!data.accessToken) {
        setMsg("Invalid response from server.");
        return;
      }
      const pair: Tokens = {
        accessToken: data.accessToken,
        ...(typeof data.refreshToken === "string" ? { refreshToken: data.refreshToken } : {}),
      };
      saveTokens(pair);
      setTokens(pair);
    } catch {
      setMsg("Network error — check that the API is running and URL rewrites are correct.");
    } finally {
      setBusy(false);
    }
  }

  async function register(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          fullName,
          phone: phone.replace(/\s/g, ""),
          ...(registerBarangayId ? { barangayId: registerBarangayId } : {}),
          ...(registerStreetPurok.trim() ? { streetPurok: registerStreetPurok.trim() } : {}),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as Partial<Tokens> & { message?: string | string[] };
      if (!res.ok) {
        const m = Array.isArray(data.message)
          ? data.message.join(" · ")
          : (data.message ?? `Registration failed (${res.status}).`);
        setMsg(m);
        return;
      }
      if (!data.accessToken) {
        setMsg("Registration succeeded but tokens were not returned.");
        return;
      }
      const pair: Tokens = {
        accessToken: data.accessToken,
        ...(typeof data.refreshToken === "string" ? { refreshToken: data.refreshToken } : {}),
      };
      saveTokens(pair);
      setTokens(pair);
    } catch {
      setMsg("Network error during registration.");
    } finally {
      setBusy(false);
    }
  }

  const captureLocation = useCallback(() => {
    setMsg(null);
    if (!navigator.geolocation) {
      setMsg("Geolocation is not available in this browser.");
      return;
    }
    setGeoBusy(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLat(Number(p.coords.latitude.toFixed(7)));
        setLon(Number(p.coords.longitude.toFixed(7)));
        setGeoBusy(false);
      },
      () => {
        setMsg("Location denied or unavailable. Enable GPS permission to send coordinates with SOS.");
        setGeoBusy(false);
      },
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 },
    );
  }, []);

  async function sendSos(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (lat == null || lon == null) {
      setMsg("Capture GPS first — coordinates are required.");
      return;
    }
    if (!tokens) return;
    setSosBusy(true);
    setSosPanel(null);
    setMsg(null);
    try {
      const res = await fetch(`${getApiBaseUrl()}/incidents/sos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokens.accessToken}`,
        },
        body: JSON.stringify({
          type: kind,
          latitude: lat,
          longitude: lon,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        incidentId?: string;
        deduplicated?: boolean;
        message?: string | string[];
      };
      if (!res.ok) {
        const m = Array.isArray(body.message)
          ? body.message.join(" · ")
          : (body.message ?? `HTTP ${res.status}`);
        setMsg(m);
        return;
      }
      const id = body.incidentId ?? "—";
      const emergencyLabel = SOS_TYPES.find((x) => x.id === kind)?.label ?? kind;
      setSosPanel({
        incidentId: id,
        deduplicated: !!body.deduplicated,
        userLat: lat,
        userLon: lon,
        emergencyLabel,
      });
    } catch {
      setMsg("Could not deliver SOS — verify API connectivity.");
    } finally {
      setSosBusy(false);
    }
  }

  function logout(): void {
    localStorage.removeItem(STORAGE);
    setTokens(null);
    setSosPanel(null);
    setMsg(null);
    setLat(null);
    setLon(null);
  }

  return (
    <div className="min-h-[100dvh] bg-[#060608] text-zinc-100">
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-black/50 backdrop-blur-lg">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-3.5">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-medium text-zinc-500 hover:text-zinc-300"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Home
          </Link>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.28em] text-rose-300/90">
            Citizen
          </div>
          {tokens ? (
            <div className="flex items-center gap-1.5 shrink-0">
              <Link
                href="/citizen/profile"
                className="inline-flex items-center gap-1 rounded-lg border border-rose-500/35 bg-rose-950/40 px-2.5 py-1.5 text-[11px] font-semibold text-rose-100 hover:bg-rose-900/35"
              >
                <UserCircle className="h-3.5 w-3.5" aria-hidden />
                Profile
              </Link>
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/[0.06]"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden />
                Sign out
              </button>
            </div>
          ) : (
            <span className="text-[10px] text-zinc-600">Not signed in</span>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-6 px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-black/35 ring-1 ring-rose-500/25 p-1">
            <IcdrrmoLogo size={56} priority className="rounded-xl" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Citizen Emergency</h1>
          <p className="mt-2 text-sm text-zinc-500">
            SOS with live coordinates. Install this page to your phone for one-tap field access.
          </p>
        </div>

        {msg ? (
          <div
            className="rounded-xl border border-rose-500/30 bg-rose-950/30 px-4 py-3 text-sm text-rose-100"
            role="alert"
          >
            {msg}
          </div>
        ) : null}

        {!tokens ? (
          <section className="rounded-2xl border border-white/[0.06] bg-zinc-950/60 p-5 shadow-panel">
            <div className="flex gap-2 rounded-xl bg-black/35 p-1">
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setMsg(null);
                }}
                className={`flex-1 rounded-lg py-2 text-xs font-semibold uppercase tracking-wide ${mode === "signin" ? "bg-white/10 text-white" : "text-zinc-500"}`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setMsg(null);
                }}
                className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-2 text-xs font-semibold uppercase tracking-wide ${mode === "register" ? "bg-white/10 text-white" : "text-zinc-500"}`}
              >
                <UserPlus className="h-3 w-3" aria-hidden /> Register
              </button>
            </div>

            {mode === "signin" ? (
              <form onSubmit={login} className="mt-6 space-y-4">
                <Field label="Email">
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    className="w-full rounded-xl border border-zinc-700 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-rose-500/40"
                  />
                </Field>
                <Field label="Password">
                  <PasswordInput
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    inputClassName="w-full rounded-xl border border-zinc-700 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-rose-500/40"
                  />
                </Field>
                <button
                  disabled={busy}
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 py-3.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                  Unlock emergency tools
                </button>
              </form>
            ) : (
              <form onSubmit={register} className="mt-6 space-y-4">
                <Field label="Full name">
                  <input
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-xl border border-zinc-700 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-rose-500/40"
                  />
                </Field>
                <Field label="Phone (e.g. +639171234567)">
                  <input
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-xl border border-zinc-700 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-rose-500/40"
                  />
                </Field>
                <Field label="Barangay">
                  <select
                    value={registerBarangayId}
                    onChange={(e) => setRegisterBarangayId(e.target.value)}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-rose-500/40"
                  >
                    <option value="">— Select (optional) —</option>
                    {registerBarangays.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Street / purok (optional)">
                  <input
                    value={registerStreetPurok}
                    onChange={(e) => setRegisterStreetPurok(e.target.value)}
                    placeholder="e.g. Purok 3, Malamawi Road"
                    className="w-full rounded-xl border border-zinc-700 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-rose-500/40 placeholder:text-zinc-600"
                  />
                </Field>
                <Field label="Email">
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-zinc-700 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-rose-500/40"
                  />
                </Field>
                <Field label="Password (min 12 characters)">
                  <PasswordInput
                    required
                    minLength={12}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    inputClassName="w-full rounded-xl border border-zinc-700 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-rose-500/40"
                  />
                </Field>
                <button
                  disabled={busy}
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 py-3.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Create citizen account
                </button>
              </form>
            )}
          </section>
        ) : (
          <section className="space-y-4">
            {getApiConfigWarning() ? (
              <div
                className="rounded-xl border border-amber-500/35 bg-amber-950/25 px-4 py-3 text-[11px] leading-relaxed text-amber-100/95"
                role="status"
              >
                {getApiConfigWarning()}
              </div>
            ) : null}

            <div className="rounded-2xl border border-white/[0.08] bg-zinc-950/70 p-4 shadow-panel">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400/90">
                    Account &amp; medical
                  </p>
                  <p className="mt-1 text-xs text-zinc-500 leading-relaxed">
                    Edit name, barangay, blood type, allergies, and nearby evacuation centers.
                  </p>
                </div>
                <UserCircle className="h-8 w-8 shrink-0 text-zinc-600" aria-hidden />
              </div>

              {profileLoading ? (
                <div className="mt-4 flex items-center gap-2 text-xs text-zinc-500">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Loading profile…
                </div>
              ) : profileErr ? (
                <p className="mt-3 text-xs text-rose-300/95 leading-relaxed">{profileErr}</p>
              ) : me ? (
                <>
                  <dl className="mt-4 grid gap-2 text-xs text-zinc-300">
                    <div className="flex justify-between gap-3 border-b border-white/[0.05] pb-2">
                      <dt className="text-zinc-500">Email</dt>
                      <dd className="font-mono text-right text-zinc-200">{me.email}</dd>
                    </div>
                    <div className="flex justify-between gap-3 border-b border-white/[0.05] pb-2">
                      <dt className="text-zinc-500">Phone</dt>
                      <dd className="font-mono text-right">{me.phone ?? "—"}</dd>
                    </div>
                    <div className="flex justify-between gap-3 pb-1">
                      <dt className="text-zinc-500">Role</dt>
                      <dd className="text-right text-zinc-400">{me.role}</dd>
                    </div>
                  </dl>
                  {me.profile ? (
                    <dl className="mt-4 grid gap-2 border-t border-white/[0.06] pt-4 text-xs text-zinc-300">
                      <div className="flex justify-between gap-3 border-b border-white/[0.05] pb-2">
                        <dt className="text-zinc-500">Full name</dt>
                        <dd className="font-medium text-white text-right">{me.profile.fullName}</dd>
                      </div>
                      <div className="flex justify-between gap-3 border-b border-white/[0.05] pb-2">
                        <dt className="text-zinc-500">Barangay</dt>
                        <dd className="text-right">{me.profile.barangay?.name ?? "— (set on profile)"}</dd>
                      </div>
                      <div className="flex justify-between gap-3 border-b border-white/[0.05] pb-2">
                        <dt className="text-zinc-500">Street / purok</dt>
                        <dd className="text-right text-zinc-200">
                          {me.profile.streetPurok?.trim() ? me.profile.streetPurok : "—"}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3 border-b border-white/[0.05] pb-2">
                        <dt className="text-zinc-500">Blood type</dt>
                        <dd className="text-right">{me.profile.bloodType.replace(/_/g, " ")}</dd>
                      </div>
                      <div className="flex justify-between gap-3 pb-1">
                        <dt className="text-zinc-500">Status</dt>
                        <dd className="text-right text-emerald-200/90">{me.profile.availabilityStatus}</dd>
                      </div>
                      {(me.profile.allergies || me.profile.medicalConditions) && (
                        <div className="rounded-lg bg-black/30 p-2.5 text-[11px] text-zinc-400 leading-snug">
                          {me.profile.allergies ? (
                            <p>
                              <span className="text-zinc-500">Allergies: </span>
                              {me.profile.allergies}
                            </p>
                          ) : null}
                          {me.profile.medicalConditions ? (
                            <p className={me.profile.allergies ? "mt-1.5" : ""}>
                              <span className="text-zinc-500">Medical: </span>
                              {me.profile.medicalConditions}
                            </p>
                          ) : null}
                        </div>
                      )}
                    </dl>
                  ) : (
                    <p className="mt-3 text-xs text-amber-200/90 leading-relaxed">
                      No profile record in the database — open the profile page to complete details.
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-3 text-xs text-zinc-500">Could not load account.</p>
              )}

              <Link
                href="/citizen/profile"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/30 py-3 text-sm font-semibold text-emerald-100 hover:bg-emerald-900/35 transition-colors"
              >
                Open full profile &amp; evacuation
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>

            <form
              onSubmit={sendSos}
              className="overflow-hidden rounded-2xl border border-rose-500/25 bg-gradient-to-b from-rose-950/40 to-black/55 shadow-panel"
            >
              <div className="border-b border-white/[0.06] bg-black/30 px-4 py-4">
                <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-rose-200/85">
                  Emergency type
                </label>
                <select
                  value={kind}
                  onChange={(e) => setKind(e.target.value as (typeof SOS_TYPES)[number]["id"])}
                  className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm font-medium text-white outline-none focus:ring-2 focus:ring-rose-500/40"
                >
                  {SOS_TYPES.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="p-6 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-zinc-500">
                  One-touch activation
                </p>
                <button
                  type="submit"
                  disabled={sosBusy || geoBusy || lat == null}
                  className="mt-6 flex min-h-[7.5rem] w-full flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-rose-500 to-rose-700 py-8 text-xl font-black uppercase tracking-[0.12em] text-white shadow-[0_24px_60px_-20px_rgba(225,29,72,0.75)] ring-1 ring-white/15 transition active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {sosBusy ? (
                    <>
                      <Loader2 className="mb-3 h-8 w-8 animate-spin" aria-hidden />
                      Transmitting…
                    </>
                  ) : (
                    <>
                      <span>Emergency</span>
                      <span className="mt-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/85">
                        Send SOS now
                      </span>
                    </>
                  )}
                </button>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] px-4 py-4 bg-black/25">
                <button
                  type="button"
                  onClick={captureLocation}
                  disabled={geoBusy}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.05] px-4 py-2.5 text-xs font-semibold text-zinc-200 hover:bg-white/[0.08] disabled:opacity-50"
                >
                  <LocateFixed className="h-4 w-4 text-emerald-400" aria-hidden />
                  {geoBusy ? "Locating…" : "Capture GPS"}
                </button>
                <div className="font-mono text-[11px] text-zinc-500">
                  {lat != null && lon != null ? (
                    <>
                      {lat.toFixed(5)}°, {lon.toFixed(5)}°
                    </>
                  ) : (
                    <>No coordinates</>
                  )}
                </div>
              </div>
            </form>

            {sosPanel ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/25 px-4 py-4 text-sm text-emerald-100">
                <CitizenSosRouteCard
                  incidentId={sosPanel.incidentId}
                  deduplicated={sosPanel.deduplicated}
                  userLat={sosPanel.userLat}
                  userLon={sosPanel.userLon}
                  emergencyLabel={sosPanel.emergencyLabel}
                />
              </div>
            ) : null}

            <p className="text-center text-[11px] leading-relaxed text-zinc-600">
              ICDRRMO ops sees new incidents immediately; the desk is at{" "}
              <Link href="/signin/operator" className="text-rose-400 underline-offset-4 hover:underline">
                operator sign-in
              </Link>
              .
            </p>
          </section>
        )}
      </main>
      <footer className="mx-auto max-w-lg px-4 py-6 text-center text-[10px] text-zinc-600 border-t border-white/[0.04]">
        Powered by: CoreLogic
      </footer>
    </div>
  );
}

function Field(props: { label: string; children: React.ReactNode }): ReactElement {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-zinc-500">
        {props.label}
      </span>
      {props.children}
    </label>
  );
}
