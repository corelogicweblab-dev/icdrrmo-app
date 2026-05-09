export function formatOpsClock(d: Date): string {
  return d.toLocaleString("en-PH", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

export function formatOpsSync(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

export function incidentBorderClass(type: string): string {
  const t = type.toUpperCase();
  if (t.includes("FIRE")) return "border-l-orange-500";
  if (t.includes("FLOOD") || t.includes("TYPHOON") || t.includes("LANDSLIDE")) return "border-l-sky-400";
  if (t.includes("MEDICAL")) return "border-l-emerald-400";
  if (t.includes("EARTHQUAKE")) return "border-l-amber-400";
  return "border-l-rose-500";
}

export function statusBadgeClass(status: string): string {
  const s = status.toUpperCase();
  if (s === "OPEN" || s === "ACKNOWLEDGED")
    return "bg-amber-500/12 text-amber-200 ring-1 ring-amber-500/25";
  if (s === "DISPATCHED" || s === "IN_PROGRESS")
    return "bg-sky-500/12 text-sky-200 ring-1 ring-sky-500/25";
  if (s === "RESOLVED" || s === "CLOSED")
    return "bg-zinc-500/10 text-zinc-400 ring-1 ring-zinc-500/20";
  return "bg-zinc-800/80 text-zinc-300 ring-1 ring-zinc-600/30";
}

/** Display-only decode of JWT payload (no verification). */
export function decodeJwtEmail(token: string): string | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
    const json = JSON.parse(atob(b64 + pad)) as Record<string, unknown>;
    if (typeof json.email === "string") return json.email;
    if (typeof json.sub === "string") return json.sub;
    return null;
  } catch {
    return null;
  }
}
