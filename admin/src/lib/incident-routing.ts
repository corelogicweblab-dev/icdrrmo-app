/** Agency queue labels — mirrors backend `RoutedAgency`. */
export const ROUTED_AGENCIES = [
  { id: "BFP", label: "BFP" },
  { id: "PNP", label: "PNP" },
  { id: "ICDRRMO_MEDICAL", label: "ICDRRMO Medical" },
  { id: "ICDRRMO_OPS", label: "ICDRRMO Ops" },
] as const;

export function routedAgencyLabel(id: string | null | undefined): string {
  return ROUTED_AGENCIES.find((a) => a.id === id)?.label ?? id ?? "—";
}

/** Default routing hint for citizen SOS types (display only). */
export function defaultAgencyForType(type: string): string {
  if (type === "FIRE") return "BFP";
  if (type === "CRIME") return "PNP";
  if (type === "MEDICAL_EMERGENCY") return "ICDRRMO Medical";
  if (type === "FLOOD" || type === "TYPHOON") return "ICDRRMO Ops";
  return "ICDRRMO Ops";
}
