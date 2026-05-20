import type { TokenPair } from "@/components/ops/ops-types";

export const CHAIRMAN_STORAGE_KEY = "icdrrmo_chairman_tokens";

export function loadChairmanTokens(): TokenPair | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CHAIRMAN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TokenPair;
    return typeof parsed.accessToken === "string" ? parsed : null;
  } catch {
    return null;
  }
}

export function saveChairmanTokens(pair: TokenPair): void {
  localStorage.setItem(CHAIRMAN_STORAGE_KEY, JSON.stringify(pair));
}

export function clearChairmanTokens(): void {
  localStorage.removeItem(CHAIRMAN_STORAGE_KEY);
}
