/** Action ids returned by API — mapped to routes / citizen tabs. */
export type AiActionId =
  | "sign_in"
  | "citizen_portal"
  | "map"
  | "prepare"
  | "sos"
  | "alerts"
  | "community"
  | "profile"
  | "home";

export type AiChatAction = {
  id: AiActionId;
  label: string;
  href: string;
  /** Citizen dashboard in-page tab (no full navigation). */
  citizenTab?: "home" | "map" | "alerts" | "community" | "prepare";
};

const ACTIONS: Record<AiActionId, AiChatAction> = {
  sign_in: { id: "sign_in", label: "Sign in", href: "/" },
  citizen_portal: { id: "citizen_portal", label: "Citizen portal", href: "/citizen" },
  map: { id: "map", label: "Open Map", href: "/citizen?tab=map", citizenTab: "map" },
  prepare: { id: "prepare", label: "Prepare", href: "/citizen?tab=prepare", citizenTab: "prepare" },
  sos: { id: "sos", label: "Emergency SOS", href: "/citizen?tab=home", citizenTab: "home" },
  alerts: { id: "alerts", label: "Alerts", href: "/citizen?tab=alerts", citizenTab: "alerts" },
  community: { id: "community", label: "Community", href: "/citizen?tab=community", citizenTab: "community" },
  profile: { id: "profile", label: "Profile", href: "/citizen/profile" },
  home: { id: "home", label: "Home", href: "/citizen?tab=home", citizenTab: "home" },
};

/** Legacy English/Tagalog labels from older API builds → action id. */
const LABEL_TO_ID: Record<string, AiActionId> = {
  "sign in": "sign_in",
  "mag-sign in": "sign_in",
  "open citizen portal": "citizen_portal",
  "buksan ang citizen portal": "citizen_portal",
  "citizen portal": "citizen_portal",
  "open map": "map",
  "open map tab": "map",
  "map tab": "map",
  "buksan ang mapa": "map",
  "prepare tab": "prepare",
  "review preparedness": "prepare",
  "check evacuation": "map",
  "emergency sos": "sos",
  "send sos": "sos",
  "alerts": "alerts",
  "community": "community",
  "profile": "profile",
};

export function resolveAiChatActions(
  idsOrLabels: string[] | undefined,
  portal: "citizen" | "chairman" | "responder" | "ops" | "home",
): AiChatAction[] {
  if (!idsOrLabels?.length) return [];
  const out: AiChatAction[] = [];
  const seen = new Set<string>();
  for (const raw of idsOrLabels) {
    const key = raw.trim().toLowerCase();
    const id = (ACTIONS[raw as AiActionId] ? raw : LABEL_TO_ID[key]) as AiActionId | undefined;
    if (!id || !ACTIONS[id] || seen.has(id)) continue;
    if (portal === "home" && !["sign_in", "citizen_portal", "map", "sos"].includes(id)) {
      continue;
    }
    if (portal === "citizen" && id === "sign_in") continue;

    if (portal === "chairman" && (id === "citizen_portal" || id === "home")) {
      if (!seen.has("chairman_dash")) {
        seen.add("chairman_dash");
        out.push({ id: "home", label: "Chairman dashboard", href: "/chairman" });
      }
      continue;
    }
    if (portal === "responder" && (id === "map" || id === "citizen_portal")) {
      if (!seen.has("responder_map")) {
        seen.add("responder_map");
        out.push({ id: "map", label: "Field map", href: "/responder/map" });
      }
      continue;
    }
    if (portal === "ops" && (id === "map" || id === "citizen_portal")) {
      if (!seen.has("ops_map")) {
        seen.add("ops_map");
        out.push({ id: "map", label: "Ops map", href: "/ops/map" });
      }
      continue;
    }

    seen.add(id);
    out.push(ACTIONS[id]);
  }
  return out;
}

export function navigateAiAction(
  action: AiChatAction,
  portal: "citizen" | "chairman" | "responder" | "ops" | "home",
  router: { push: (url: string) => void },
): void {
  if (
    portal === "citizen" &&
    action.citizenTab &&
    typeof window !== "undefined" &&
    window.location.pathname.startsWith("/citizen")
  ) {
    window.dispatchEvent(
      new CustomEvent("icdrrmo-citizen-tab", { detail: { tab: action.citizenTab } }),
    );
    window.history.replaceState(null, "", action.href);
    return;
  }
  router.push(action.href);
}
