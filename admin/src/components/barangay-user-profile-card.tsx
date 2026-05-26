"use client";

import type { ReactElement } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { KeyRound, Loader2, Save, Shield } from "lucide-react";
import { PasswordInput } from "@/components/password-input";
import {
  barangayFieldsForPatch,
  loadBarangaysForProfileForm,
  resolveBarangaySelectValue,
  withProfileBarangay,
} from "@/lib/public-barangays";
import { opsApiErrorUserMessage, opsFetchJson, OpsApiError } from "@/lib/ops-api";
import { getApiBaseUrl } from "@/lib/env";
import { fetchWithTimeout } from "@/lib/api-fetch";

type Barangay = { id: string; name: string; code: string };

type MeUser = {
  id: string;
  email: string;
  phone: string | null;
  role: string;
  profile: null | {
    fullName: string;
    barangayId: string | null;
    address: string | null;
    streetPurok: string | null;
    barangay: Barangay | null;
  };
};

const ROLES_REQUIRING_BARANGAY = new Set(["OPERATOR", "BARANGAY_CHAIRMAN", "RESPONDER"]);

export type BarangayUserProfileCardProps = {
  accessToken: string;
  /** Force barangay selection even for roles that are not in the default set. */
  requireBarangay?: boolean;
  /** PNP / BFP city-wide desk — no barangay ID (avoids wrong scope & redirect flows). */
  agencyDesk?: boolean;
  className?: string;
};

export function BarangayUserProfileCard({
  accessToken,
  requireBarangay: requireBarangayProp,
  agencyDesk = false,
  className = "",
}: BarangayUserProfileCardProps): ReactElement {
  const [me, setMe] = useState<MeUser | null>(null);
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [profileBusy, setProfileBusy] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [barangayId, setBarangayId] = useState("");
  const [address, setAddress] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdBusy, setPwdBusy] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<string | null>(null);

  const requireBarangay = useMemo(() => {
    if (agencyDesk) return false;
    if (requireBarangayProp !== undefined) return requireBarangayProp;
    return me?.role ? ROLES_REQUIRING_BARANGAY.has(me.role) : false;
  }, [agencyDesk, requireBarangayProp, me?.role]);

  const selectedBarangay = useMemo(
    () => barangays.find((b) => b.id === barangayId) ?? me?.profile?.barangay ?? null,
    [barangays, barangayId, me?.profile?.barangay],
  );

  const load = useCallback(async () => {
    setErr(null);
    try {
      const u = await opsFetchJson<MeUser>("/users/me", accessToken);
      setMe(u);
      if (!agencyDesk) {
        const raw = await loadBarangaysForProfileForm(accessToken);
        const b = u.profile?.barangay ? withProfileBarangay(raw, u.profile.barangay) : raw;
        setBarangays(b);
        if (u.profile) {
          setBarangayId(resolveBarangaySelectValue(u.profile.barangayId, u.profile.barangay, b));
        }
      } else {
        setBarangays([]);
        setBarangayId("");
      }
      if (u.profile) {
        setFullName(u.profile.fullName);
        setPhone(u.phone ?? "");
        setAddress((u.profile.address ?? u.profile.streetPurok ?? "").trim());
      } else {
        setFullName("");
        setPhone(u.phone ?? "");
      }
    } catch (e: unknown) {
      setErr(e instanceof OpsApiError ? opsApiErrorUserMessage(e) : "Failed to load profile");
    }
  }, [accessToken, agencyDesk]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSaveProfile(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (requireBarangay && !barangayId.trim()) {
      setErr("Barangay ID is required — select your official barangay.");
      return;
    }
    setProfileBusy(true);
    setSaved(false);
    setErr(null);
    try {
      await opsFetchJson("/users/me", accessToken, {
        method: "PATCH",
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone: phone.trim() || null,
          ...(agencyDesk ? {} : barangayFieldsForPatch(barangayId)),
          address: address.trim() || null,
          streetPurok: address.trim() || null,
        }),
      });
      setSaved(true);
      void load();
    } catch (e: unknown) {
      setErr(e instanceof OpsApiError ? opsApiErrorUserMessage(e, 400) : "Save failed");
    } finally {
      setProfileBusy(false);
    }
  }

  async function onChangePassword(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setPwdMsg(null);
    if (newPassword.length < 12) {
      setPwdMsg("New password must be at least 12 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdMsg("New password and confirmation do not match.");
      return;
    }
    setPwdBusy(true);
    try {
      const res = await fetchWithTimeout(`${getApiBaseUrl()}/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string | string[] };
      if (!res.ok) {
        const m = Array.isArray(data.message)
          ? data.message.join(" · ")
          : (data.message ?? `Password change failed (${res.status}).`);
        setPwdMsg(m);
        return;
      }
      setPwdMsg("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setPwdMsg("Network error — try again.");
    } finally {
      setPwdBusy(false);
    }
  }

  const roleLabel = me?.role?.replace(/_/g, " ") ?? "—";

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-white">
            {agencyDesk ? "Agency account" : "Barangay profile"}
          </h2>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            {agencyDesk
              ? "City-wide agency desk — contact details and password only (no barangay assignment)."
              : "Barangay ID, full name, role, phone, address — required for dispatch and agency calls."}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-orange-500/20 bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-wide text-zinc-400">
          <Shield className="h-3.5 w-3.5 text-rose-400" aria-hidden />
          {roleLabel}
        </span>
      </div>

      {err ? (
        <p className="text-sm text-rose-300/90">
          {err}{" "}
          <button type="button" onClick={() => void load()} className="underline text-orange-300">
            Retry
          </button>
        </p>
      ) : null}
      {saved ? <p className="text-xs text-orange-400/90">Profile saved.</p> : null}

      <form
        onSubmit={(ev) => void onSaveProfile(ev)}
        className="rounded-2xl border border-orange-500/15 bg-black/35 p-5 space-y-4"
      >
        {agencyDesk ? (
          <p className="rounded-lg border border-orange-500/15 bg-orange-950/15 px-3 py-2 text-[11px] text-orange-100/90 leading-relaxed">
            You are on the <strong className="text-white">{roleLabel}</strong> city-wide operations desk.
            Incidents are routed by type (fire → BFP, crime → PNP), not by a single barangay profile.
          </p>
        ) : (
          <label className="block space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Barangay ID</span>
            <select
              value={barangayId}
              onChange={(e) => setBarangayId(e.target.value)}
              required={requireBarangay}
              className="w-full rounded-lg border border-orange-500/20 bg-black/40 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-rose-500/40"
            >
              <option value="">— Select barangay —</option>
              {barangays.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
            {selectedBarangay ? (
              <p className="text-[10px] text-zinc-500 font-mono">
                ID: {selectedBarangay.id} · Code: {selectedBarangay.code}
              </p>
            ) : (
              <p className="text-[10px] text-amber-400/80">Select a barangay to save your official barangay ID.</p>
            )}
          </label>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Full name</span>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full rounded-lg border border-orange-500/20 bg-black/40 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-rose-500/40"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Role</span>
            <input
              value={roleLabel}
              readOnly
              className="w-full rounded-lg border border-white/5 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-500"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Phone number</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+639…"
              className="w-full rounded-lg border border-orange-500/20 bg-black/40 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-rose-500/40"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Email</span>
            <input
              value={me?.email ?? ""}
              readOnly
              className="w-full rounded-lg border border-white/5 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-500"
            />
          </label>
          <label className="block space-y-1.5 sm:col-span-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              {agencyDesk ? "Office / station (optional)" : "Address"}
            </span>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={agencyDesk ? "BFP/PNP station or duty location" : "Street, purok, sitio"}
              className="w-full rounded-lg border border-orange-500/20 bg-black/40 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-rose-500/40"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={profileBusy}
          className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
        >
          {profileBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
          Save profile
        </button>
      </form>

      <form
        onSubmit={(ev) => void onChangePassword(ev)}
        className="rounded-2xl border border-orange-500/15 bg-black/35 p-5 space-y-4"
      >
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-amber-400/90" aria-hidden />
          <h3 className="text-sm font-semibold text-white">Password</h3>
        </div>
        <p className="text-[11px] text-zinc-500">Change your sign-in password (minimum 12 characters).</p>
        {pwdMsg ? (
          <p className={`text-xs ${pwdMsg.includes("updated") ? "text-orange-400/90" : "text-rose-300/90"}`}>{pwdMsg}</p>
        ) : null}
        <label className="block space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Current password</span>
          <PasswordInput
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            autoComplete="current-password"
            inputClassName="rounded-lg border border-orange-500/20 bg-black/40 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-rose-500/40"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">New password</span>
            <PasswordInput
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={12}
              autoComplete="new-password"
              inputClassName="rounded-lg border border-orange-500/20 bg-black/40 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-rose-500/40"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Confirm new password</span>
            <PasswordInput
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={12}
              autoComplete="new-password"
              inputClassName="rounded-lg border border-orange-500/20 bg-black/40 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-rose-500/40"
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={pwdBusy}
          className="inline-flex items-center gap-2 rounded-xl border border-orange-500/25 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-zinc-200 hover:bg-white/[0.08] disabled:opacity-50"
        >
          {pwdBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <KeyRound className="h-4 w-4" aria-hidden />}
          Update password
        </button>
      </form>
    </div>
  );
}
