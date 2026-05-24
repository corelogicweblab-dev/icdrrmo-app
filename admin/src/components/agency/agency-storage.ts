import type { TokenPair } from "@/components/ops/ops-types";

export const PNP_STORAGE_KEY = "icdrrmo_pnp_tokens";
export const BFP_STORAGE_KEY = "icdrrmo_bfp_tokens";

export function loadAgencyTokens(key: string): TokenPair | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TokenPair;
    return typeof parsed.accessToken === "string" ? parsed : null;
  } catch {
    return null;
  }
}

export function saveAgencyTokens(key: string, pair: TokenPair): void {
  localStorage.setItem(key, JSON.stringify(pair));
}

export function clearAgencyTokens(key: string): void {
  localStorage.removeItem(key);
}

export function loadPnpTokens(): TokenPair | null {
  return loadAgencyTokens(PNP_STORAGE_KEY);
}

export function savePnpTokens(pair: TokenPair): void {
  saveAgencyTokens(PNP_STORAGE_KEY, pair);
}

export function clearPnpTokens(): void {
  clearAgencyTokens(PNP_STORAGE_KEY);
}

export function loadBfpTokens(): TokenPair | null {
  return loadAgencyTokens(BFP_STORAGE_KEY);
}

export function saveBfpTokens(pair: TokenPair): void {
  saveAgencyTokens(BFP_STORAGE_KEY, pair);
}

export function clearBfpTokens(): void {
  clearAgencyTokens(BFP_STORAGE_KEY);
}

export function clearAllAgencyTokens(): void {
  clearPnpTokens();
  clearBfpTokens();
}
