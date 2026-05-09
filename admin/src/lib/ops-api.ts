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
  const res = await fetch(url, { ...init, headers });
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
