"use client";

import type { ReactElement } from "react";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Save, Shield } from "lucide-react";
import { useOpsSession } from "@/components/ops/ops-session-context";
import { OpsPanelCard } from "@/components/ops/ops-widgets";
import {
  barangayFieldsForPatch,
  loadBarangaysForStaffSession,
  resolveBarangaySelectValue,
  withProfileBarangay,
} from "@/lib/public-barangays";
import { opsFetchJson, OpsApiError } from "@/lib/ops-api";

type Barangay = { id: string; name: string; code: string };

type MeUser = {
  id: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  profile: null | {
    fullName: string;
    barangayId: string | null;
    address: string | null;
    bloodType: string;
    allergies: string | null;
    medicalConditions: string | null;
    emergencyNotes: string | null;
    profilePhotoUrl: string | null;
    availabilityStatus: string;
    barangay: Barangay | null;
  };
  responder: null | {
    status: string;
    badgeNumber: string | null;
    vehicle: { plateNumber: string; name: string | null } | null;
    locations: Array<{ latitude: unknown; longitude: unknown; recordedAt: string }>;
    assignments: Array<{ id: string; title: string | null; status: string }>;
    dispatchAssignments: Array<{
      status: string;
      incident: { id: string; title: string | null; status: string } | null;
    }>;
  };
  notifications: Array<{ id: string; title: string; body: string; type: string; createdAt: string; readAt: string | null }>;
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

const AVAIL = ["ACTIVE", "STANDBY", "UNAVAILABLE"] as const;

export default function OpsProfilePage(): ReactElement {
  const { tokens } = useOpsSession();
  const access = tokens?.accessToken;
  const [me, setMe] = useState<MeUser | null>(null);
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [barangayId, setBarangayId] = useState("");
  const [address, setAddress] = useState("");
  const [bloodType, setBloodType] = useState<string>("UNKNOWN");
  const [allergies, setAllergies] = useState("");
  const [medicalConditions, setMedicalConditions] = useState("");
  const [emergencyNotes, setEmergencyNotes] = useState("");
  const [availabilityStatus, setAvailabilityStatus] = useState<string>("ACTIVE");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState("");

  const load = useCallback(async () => {
    if (!access) return;
    setErr(null);
    try {
      const u = await opsFetchJson<MeUser>("/users/me", access);
      const raw = await loadBarangaysForStaffSession(access);
      const b = u.profile?.barangay ? withProfileBarangay(raw, u.profile.barangay) : raw;
      setMe(u);
      setBarangays(b);
      if (u.profile) {
        setFullName(u.profile.fullName);
        setPhone(u.phone ?? "");
        setBarangayId(resolveBarangaySelectValue(u.profile.barangayId, u.profile.barangay, b));
        setAddress(u.profile.address ?? "");
        setBloodType(u.profile.bloodType ?? "UNKNOWN");
        setAllergies(u.profile.allergies ?? "");
        setMedicalConditions(u.profile.medicalConditions ?? "");
        setEmergencyNotes(u.profile.emergencyNotes ?? "");
        setAvailabilityStatus(u.profile.availabilityStatus ?? "ACTIVE");
        setProfilePhotoUrl(u.profile.profilePhotoUrl ?? "");
      }
    } catch (e: unknown) {
      setErr(e instanceof OpsApiError ? e.message : "Failed to load profile");
    }
  }, [access]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!access) return;
    if ((me?.role === "OPERATOR" || me?.role === "BARANGAY_CHAIRMAN") && !barangayId.trim()) {
      setErr("Barangay is required — select your official barangay (barangay ID) before saving.");
      return;
    }
    setBusy(true);
    setSaved(false);
    setErr(null);
    try {
      await opsFetchJson("/users/me", access, {
        method: "PATCH",
        body: JSON.stringify({
          fullName,
          phone: phone.trim() || null,
          ...barangayFieldsForPatch(barangayId),
          address: address.trim() || null,
          bloodType,
          allergies: allergies.trim() || null,
          medicalConditions: medicalConditions.trim() || null,
          emergencyNotes: emergencyNotes.trim() || null,
          availabilityStatus,
          profilePhotoUrl: profilePhotoUrl.trim() || null,
        }),
      });
      setSaved(true);
      void load();
    } catch (e: unknown) {
      setErr(e instanceof OpsApiError ? e.body?.slice(0, 400) ?? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  if (!access) {
    return <p className="p-6 text-sm text-zinc-500">Sign in to manage your EOC profile.</p>;
  }

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white tracking-tight">Operator profile</h2>
          <p className="text-xs text-zinc-500 mt-1">
            Medical and contact data supports dispatch and evacuation coordination.
          </p>
        </div>
        {me ? (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-orange-500/20 bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-wide text-zinc-400">
            <Shield className="h-3.5 w-3.5 text-rose-400" aria-hidden />
            {me.role}
          </span>
        ) : null}
      </div>

      {err ? <p className="text-sm text-rose-300/90">{err}</p> : null}
      {saved ? <p className="text-xs text-orange-400/90">Profile saved.</p> : null}

      {!me ? (
        <div className="flex items-center gap-2 text-zinc-500 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading…
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <form onSubmit={(ev) => void onSave(ev)} className="space-y-6 transition-all duration-300">
            <OpsPanelCard title="Identity & assignment" subtitle="Synced to PostgreSQL user_profiles">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Full name</span>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-lg border border-orange-500/20 bg-black/40 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-rose-500/40"
                    required
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Email</span>
                  <input
                    value={me.email}
                    readOnly
                    className="w-full rounded-lg border border-white/5 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-500"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Phone</span>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-lg border border-orange-500/20 bg-black/40 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-rose-500/40"
                    placeholder="+639…"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Barangay (required for EOC scope)
                  </span>
                  <select
                    value={barangayId}
                    onChange={(e) => setBarangayId(e.target.value)}
                    required={me.role === "OPERATOR" || me.role === "BARANGAY_CHAIRMAN"}
                    className="w-full rounded-lg border border-orange-500/20 bg-black/40 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-rose-500/40"
                  >
                    <option value="">— Select barangay —</option>
                    {barangays.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-zinc-500">
                    Saves your official barangay ID for incident scope and direct agency calls.
                  </p>
                </label>
                <label className="block space-y-1.5 sm:col-span-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Address</span>
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full rounded-lg border border-orange-500/20 bg-black/40 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-rose-500/40"
                  />
                </label>
              </div>
            </OpsPanelCard>

            <OpsPanelCard title="Medical & availability" subtitle="Responder desk + citizen care">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Blood type</span>
                  <select
                    value={bloodType}
                    onChange={(e) => setBloodType(e.target.value)}
                    className="w-full rounded-lg border border-orange-500/20 bg-black/40 px-3 py-2 text-sm text-zinc-100"
                  >
                    {BLOOD.map((b) => (
                      <option key={b} value={b}>
                        {b.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">EOC status</span>
                  <select
                    value={availabilityStatus}
                    onChange={(e) => setAvailabilityStatus(e.target.value)}
                    className="w-full rounded-lg border border-orange-500/20 bg-black/40 px-3 py-2 text-sm text-zinc-100"
                  >
                    {AVAIL.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1.5 sm:col-span-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Allergies</span>
                  <textarea
                    value={allergies}
                    onChange={(e) => setAllergies(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-orange-500/20 bg-black/40 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-rose-500/40"
                  />
                </label>
                <label className="block space-y-1.5 sm:col-span-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Medical conditions</span>
                  <textarea
                    value={medicalConditions}
                    onChange={(e) => setMedicalConditions(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-orange-500/20 bg-black/40 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-rose-500/40"
                  />
                </label>
                <label className="block space-y-1.5 sm:col-span-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Emergency notes</span>
                  <textarea
                    value={emergencyNotes}
                    onChange={(e) => setEmergencyNotes(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-orange-500/20 bg-black/40 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-rose-500/40"
                  />
                </label>
                <label className="block space-y-1.5 sm:col-span-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Profile photo URL (HTTPS or data URL)
                  </span>
                  <input
                    value={profilePhotoUrl}
                    onChange={(e) => setProfilePhotoUrl(e.target.value)}
                    className="w-full rounded-lg border border-orange-500/20 bg-black/40 px-3 py-2 text-xs font-mono text-zinc-200 outline-none focus:border-rose-500/40"
                    placeholder="https://…"
                  />
                </label>
              </div>
            </OpsPanelCard>

            {me.responder ? (
              <OpsPanelCard title="Responder assignment" subtitle="Read-only from dispatch records">
                <dl className="grid gap-2 text-sm text-zinc-300">
                  <div className="flex justify-between gap-4">
                    <dt className="text-zinc-500">Field status</dt>
                    <dd className="font-mono text-xs text-orange-200">{me.responder.status}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-zinc-500">Vehicle</dt>
                    <dd>{me.responder.vehicle?.plateNumber ?? "—"}</dd>
                  </div>
                </dl>
                <div className="mt-4 space-y-2">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500">Recent incidents</p>
                  <ul className="space-y-1 text-xs text-zinc-400 max-h-32 overflow-y-auto">
                    {me.responder.assignments?.length ? (
                      me.responder.assignments.map((a) => (
                        <li key={a.id} className="truncate border-l-2 border-rose-500/40 pl-2">
                          {a.title ?? a.id} · {a.status}
                        </li>
                      ))
                    ) : (
                      <li className="text-zinc-600">No assigned incidents in snapshot.</li>
                    )}
                  </ul>
                </div>
              </OpsPanelCard>
            ) : null}

            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow-glow hover:bg-rose-500 disabled:opacity-50 transition-colors"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
              Save profile
            </button>
          </form>

          <aside className="space-y-4">
            <OpsPanelCard title="Recent alerts" subtitle="In-app notifications">
              <ul className="space-y-3 max-h-[420px] overflow-y-auto text-xs">
                {me.notifications?.length ? (
                  me.notifications.map((n) => (
                    <li key={n.id} className="rounded-lg border border-orange-500/12 bg-black/30 p-2.5">
                      <p className="font-medium text-zinc-200">{n.title}</p>
                      <p className="text-zinc-500 mt-1 leading-snug">{n.body}</p>
                      <p className="text-[10px] text-zinc-600 mt-1.5">
                        {n.type} · {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </li>
                  ))
                ) : (
                  <li className="text-zinc-600">No notifications yet.</li>
                )}
              </ul>
            </OpsPanelCard>
          </aside>
        </div>
      )}
    </div>
  );
}
