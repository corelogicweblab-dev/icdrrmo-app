import { getApiBaseUrl } from "@/lib/env";
import { IABELA_SEED_BARANGAY_PAIRS } from "@/lib/isabela-seed-barangays";

export type PublicBarangayRow = { id: string; name: string; code: string };

/** `GET /barangays/public` — no JWT. */
export async function fetchPublicBarangayRows(): Promise<PublicBarangayRow[]> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/barangays/public`);
    if (!res.ok) return [];
    const j = (await res.json()) as unknown;
    if (!Array.isArray(j)) return [];
    return j.filter((x): x is PublicBarangayRow => {
      const o = x as Record<string, unknown>;
      return typeof o.id === "string" && typeof o.name === "string" && typeof o.code === "string";
    });
  } catch {
    return [];
  }
}

/** Offline-safe list when API returns nothing (empty DB or network). Option `id` is the barangay UUID from API, or `code` when using seed-only rows. */
export function fallbackPublicBarangayRows(): PublicBarangayRow[] {
  return IABELA_SEED_BARANGAY_PAIRS.map(([code, name]) => ({ id: code, name, code }));
}

export async function loadBarangayPickList(): Promise<PublicBarangayRow[]> {
  const api = await fetchPublicBarangayRows();
  return api.length > 0 ? api : fallbackPublicBarangayRows();
}

/** Match profile to `<select value>` (UUID from API rows, or seed `id` which equals `code`). */
export function resolveBarangaySelectValue(
  profileBarangayId: string | null | undefined,
  profileBarangay: { code?: string } | null | undefined,
  rows: PublicBarangayRow[],
): string {
  const bid = (profileBarangayId ?? "").trim();
  if (bid && rows.some((r) => r.id === bid)) return bid;
  const c = profileBarangay?.code?.trim();
  if (c) {
    const hit = rows.find((r) => r.code.toUpperCase() === c.toUpperCase());
    if (hit) return hit.id;
  }
  return bid;
}

/** `PATCH /users/me` — send either UUID or seed code, never both. */
export function barangayFieldsForPatch(selection: string): { barangayId?: string | null; barangayCode?: string } {
  const v = selection.trim();
  if (!v) return { barangayId: null };
  if (/^IC-\d{3}$/i.test(v)) return { barangayCode: v.toUpperCase() };
  return { barangayId: v };
}
