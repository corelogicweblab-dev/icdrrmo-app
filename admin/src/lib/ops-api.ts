import { fetchWithTimeout } from "@/lib/api-fetch";
import { getApiBaseUrl } from "@/lib/env";

export class OpsApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: string,
  ) {
    super(message);
    this.name = "OpsApiError";
  }
}

/** Prefer Nest `message` from JSON body; fall back to status line or truncated body. */
export function opsApiErrorUserMessage(e: OpsApiError, bodyMax = 280): string {
  try {
    const o = JSON.parse(e.body ?? "{}") as { message?: unknown };
    if (typeof o.message === "string" && o.message.trim()) {
      const m = o.message.trim();
      if (e.status >= 500 && /internal server error/i.test(m)) {
        return "Dashboard data is temporarily unavailable. Tap Retry load, or sign out and sign in again. If this continues, contact ICT support.";
      }
      return m;
    }
  } catch {
    /* ignore */
  }
  if (e.status >= 500) {
    return "Dashboard data is temporarily unavailable. Tap Retry load, or sign out and sign in again.";
  }
  const b = e.body?.trim();
  if (b) return b.length <= bodyMax ? b : `${e.message}: ${b.slice(0, bodyMax)}…`;
  return e.message;
}

export async function opsFetchJson<T>(
  path: string,
  accessToken: string,
  init?: RequestInit,
): Promise<T> {
  const url = `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(init?.headers ?? undefined);
  headers.set("Authorization", `Bearer ${accessToken}`);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetchWithTimeout(url, { ...init, headers });
  const text = await res.text();
  if (!res.ok) {
    throw new OpsApiError(`HTTP ${res.status}`, res.status, text);
  }
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}
