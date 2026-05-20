import { getApiBaseUrl } from "@/lib/env";

export const DEFAULT_FETCH_TIMEOUT_MS = 20_000;

export class ApiTimeoutError extends Error {
  constructor(message = "Request timed out") {
    super(message);
    this.name = "ApiTimeoutError";
  }
}

/** Fetch that rejects on timeout instead of hanging indefinitely. */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = DEFAULT_FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new ApiTimeoutError(
        `The server did not respond within ${Math.round(timeoutMs / 1000)} seconds.`,
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

/** Lightweight probe — does not require database (GET /health). */
export async function pingApiHealth(timeoutMs = 8_000): Promise<ApiReachability> {
  const url = `${getApiBaseUrl().replace(/\/$/, "")}/health`;
  try {
    const res = await fetchWithTimeout(url, { method: "GET", cache: "no-store" }, timeoutMs);
    if (res.ok) {
      return { ok: true, message: "API online" };
    }
    return {
      ok: false,
      message: `API returned HTTP ${res.status}. Start the Nest API (npm run dev:api) or Docker stack.`,
    };
  } catch (err: unknown) {
    if (err instanceof ApiTimeoutError) {
      return {
        ok: false,
        message:
          "API timed out. Ensure Postgres is running (npm run db:setup) and the API is started (npm run dev:api).",
      };
    }
    const onLocal =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
    if (onLocal) {
      return {
        ok: false,
        message:
          "Cannot reach the API. Run npm run db:setup (Docker), then npm run dev:api and npm run dev:admin in separate terminals.",
      };
    }
    return {
      ok: false,
      message: "Cannot reach the emergency services API. Check your network or contact ICT support.",
    };
  }
}
