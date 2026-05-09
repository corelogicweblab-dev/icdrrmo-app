import type { TokenPair } from "./ops-types";

export const OPS_STORAGE_KEY = "icdrrmo_ops_tokens";

export function loadOpsTokens(): TokenPair | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(OPS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TokenPair;
    if (typeof parsed.accessToken === "string") return parsed;
    return null;
  } catch {
    return null;
  }
}

export function saveOpsTokens(pair: TokenPair): void {
  localStorage.setItem(OPS_STORAGE_KEY, JSON.stringify(pair));
}

export function clearOpsTokens(): void {
  localStorage.removeItem(OPS_STORAGE_KEY);
}

export const OPS_SOUND_MUTED_KEY = "icdrrmo_ops_sound_muted";

export function loadSoundMuted(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(OPS_SOUND_MUTED_KEY) === "1";
}

export function saveSoundMuted(muted: boolean): void {
  localStorage.setItem(OPS_SOUND_MUTED_KEY, muted ? "1" : "0");
}
