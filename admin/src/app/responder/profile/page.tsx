"use client";

import type { ReactElement } from "react";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Save } from "lucide-react";
import { useResponderSession, isResponderRole } from "@/components/responder/responder-session-context";
import { OpsPanelCard } from "@/components/ops/ops-widgets";
import { opsFetchJson, OpsApiError } from "@/lib/ops-api";
import {
  barangayFieldsForPatch,
  loadBarangaysForStaffSession,
  resolveBarangaySelectValue,
  withProfileBarangay,
} from "@/lib/public-barangays";

type Barangay = { id: string; name: string; code: string };

type MeUser = {
  id: string;
  email: string;
  phone: string | null;
  role: string;
  profile: null | {
    fullName: string;
    barangayId: string | null;
    barangay?: { id: string; name: string; code: string } | null;
    address: string | null;
    bloodType: string;
    allergies: string | null;
    medicalConditions: string | null;
    emergencyNotes: string | null;
    profilePhotoUrl: string | null;
    availabilityStatus: string;
  };
  responder: null | {
    status: string;
    vehicle: { plateNumber: string } | null;
    assignments: Array<{ id: string; title: string | null; status: string }>;
  };
  notifications: Array<{ id: string; title: string; body: string; type: string; createdAt: string }>;
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

export default function ResponderProfilePage(): ReactElement {
  const { tokens } = useResponderSession();
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
  const [bloodType, setBloodType] = useState("UNKNOWN");
  const [allergies, setAllergies] = useState("");
  const [medicalConditions, setMedicalConditions] = useState("");
  const [emergencyNotes, setEmergencyNotes] = useState("");
  const [availabilityStatus, setAvailabilityStatus] = useState("ACTIVE");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState("");

  const load = useCallback(async () => {
    if (!access || !isResponderRole(access)) return;
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
    return (
      <div className="p-8 text-center text-sm text-zinc-400">
        <Link href="/" className="text-sky-400 underline">
          Sign in
        </Link>
      </div>
    );
  }

  if (!isResponderRole(access)) {
    return <p className="p-8 text-sm text-amber-200/90">Responder account required.</p>;
  }

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-6">
      {err ? <p className="text-sm text-rose-300">{err}</p> : null}
      {saved ? <p className="text-xs text-emerald-400">Saved.</p> : null}
      {!me ? (
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" aria-hidden />
      ) : (
        <form onSubmit={(ev) => void onSave(ev)} className="space-y-6">
          <OpsPanelCard title="Responder profile">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1 text-xs">
                <span className="text-zinc-500">Full name</span>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm"
                  required
                />
              </label>
              <label className="block space-y-1 text-xs">
                <span className="text-zinc-500">Phone</span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm"
                />
              </label>
              <label className="block space-y-1 text-xs sm:col-span-2">
                <span className="text-zinc-500">Barangay</span>
                <select
                  value={barangayId}
                  onChange={(e) => setBarangayId(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm"
                >
                  <option value="">— Select —</option>
                  {barangays.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1 text-xs sm:col-span-2">
                <span className="text-zinc-500">Medical / allergies</span>
                <textarea
                  value={medicalConditions}
                  onChange={(e) => setMedicalConditions(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm"
                />
              </label>
              <label className="block space-y-1 text-xs">
                <span className="text-zinc-500">Blood</span>
                <select
                  value={bloodType}
                  onChange={(e) => setBloodType(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm"
                >
                  {BLOOD.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1 text-xs">
                <span className="text-zinc-500">Availability</span>
                <select
                  value={availabilityStatus}
                  onChange={(e) => setAvailabilityStatus(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm"
                >
                  {AVAIL.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </OpsPanelCard>
          {me.responder ? (
            <OpsPanelCard title="Dispatch snapshot">
              <p className="text-xs text-zinc-400">
                Status <span className="text-sky-300 font-mono">{me.responder.status}</span> · Vehicle{" "}
                {me.responder.vehicle?.plateNumber ?? "—"}
              </p>
            </OpsPanelCard>
          ) : null}
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </button>
        </form>
      )}
    </div>
  );
}
