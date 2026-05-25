/** Extract human-readable message from NestJS JSON error bodies. */
export function apiErrorMessageFromBody(data: unknown, status: number): string {
  if (data && typeof data === "object" && "message" in data) {
    const m = (data as { message: unknown }).message;
    if (Array.isArray(m)) {
      const parts = m.filter((x): x is string => typeof x === "string");
      if (parts.length) return parts.join("; ");
    }
    if (typeof m === "string" && m.trim()) return m.trim();
  }
  return `Request failed (${status})`;
}
