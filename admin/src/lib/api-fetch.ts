import { getApiBaseUrl, isFirebaseHostingOrigin } from "@/lib/env";

/** Local Next dev — short timeouts. Firebase + Render cold start needs longer. */
export function getApiTimeoutMs(): number {
  return isFirebaseHostingOrigin() ? 90_000 : 20_000;
}

export const DEFAULT_FETCH_TIMEOUT_MS = 20_000;

export class ApiTimeoutError extends Error {
  constructor(message = "Request timed out") {
    super(message);
    this.name = "ApiTimeoutError";
  }
}

function isLocalDevHost(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1";
}

/** User-facing text — never show npm commands on the public Firebase site. */
export function formatApiReachabilityError(err: unknown, context: "health" | "login"): string {
  if (err instanceof ApiTimeoutError) {
    if (isLocalDevHost()) {
      return context === "login"
        ? "Sign-in timed out. Start the API (npm run dev:api) and database (npm run db:setup), then try again."
        : "API timed out. Ensure Postgres is running (npm run db:setup) and the API is started (npm run dev:api).";
    }
    return "The ICDRRMO server is waking up (first request can take up to 90 seconds on Render). Please wait, then tap Continue again.";
  }
  if (isLocalDevHost()) {
    return "Cannot reach the API. Run npm run db:setup, then npm run dev:api and npm run dev:admin.";
  }
  return "Cannot reach the ICDRRMO emergency API. Check your internet connection, wait one minute, and try again. If this continues, contact ICT support.";
}

/** Fetch that rejects on timeout instead of hanging indefinitely. */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs?: number,
): Promise<Response> {
  const ms = timeoutMs ?? (typeof window !== "undefined" ? getApiTimeoutMs() : DEFAULT_FETCH_TIMEOUT_MS);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new ApiTimeoutError(
        `The server did not respond within ${Math.round(ms / 1000)} seconds.`,
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export type ApiReachability = {
  ok: boolean;
  message: string;
};

/** Lightweight probe — GET /health (no database). Retries help Render cold start. */
export async function pingApiHealth(timeoutMs?: number): Promise<ApiReachability> {
  const perTry = timeoutMs ?? (isFirebaseHostingOrigin() ? 35_000 : 8_000);
  const url = `${getApiBaseUrl().replace(/\/$/, "")}/health`;
  const tries = isFirebaseHostingOrigin() ? 3 : 1;

  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetchWithTimeout(url, { method: "GET", cache: "no-store" }, perTry);
      if (res.ok) {
        return { ok: true, message: "API online" };
      }
      if (res.status >= 500 && i < tries - 1) {
        await delay(2_000);
        continue;
      }
      return {
        ok: false,
        message: isLocalDevHost()
          ? `API returned HTTP ${res.status}. Start the Nest API (npm run dev:api).`
          : `Emergency API returned HTTP ${res.status}. Try again in a minute.`,
      };
    } catch (err: unknown) {
      if (i < tries - 1) {
        await delay(2_500);
        continue;
      }
      return { ok: false, message: formatApiReachabilityError(err, "health") };
    }
  }
  return { ok: false, message: formatApiReachabilityError(new ApiTimeoutError(), "health") };
}

/** Wake Render API before login — reduces “timeout on first click” for cold services. */
export async function wakeEmergencyApi(): Promise<ApiReachability> {
  return pingApiHealth(isFirebaseHostingOrigin() ? 40_000 : 10_000);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
