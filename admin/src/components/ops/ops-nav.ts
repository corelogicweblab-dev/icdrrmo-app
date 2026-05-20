import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Archive,
  BarChart3,
  Building2,
  CloudLightning,
  FileStack,
  Home,
  LayoutDashboard,
  Map,
  Megaphone,
  MessageSquare,
  Mic,
  ScrollText,
  Send,
  Server,
  Settings,
  Shield,
  Truck,
  UserCircle,
  Users,
} from "lucide-react";

export type OpsNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export type OpsNavSection = { title: string; items: OpsNavItem[] };

/** Recommended sidebar — all routes exist under /ops/... */
export const OPS_NAV_SECTIONS: OpsNavSection[] = [
  {
    title: "Operations",
    items: [
      { href: "/ops", label: "Dashboard", icon: LayoutDashboard },
      { href: "/ops/profile", label: "My profile", icon: UserCircle },
      { href: "/ops/incidents", label: "Live incidents", icon: Activity },
      { href: "/ops/map", label: "Realtime map", icon: Map },
      { href: "/ops/dispatch", label: "Dispatch", icon: Send },
      { href: "/ops/responders", label: "Responders", icon: Users },
      { href: "/ops/vehicles", label: "Vehicles", icon: Truck },
      { href: "/ops/weather", label: "Weather & disaster", icon: CloudLightning },
      { href: "/ops/evacuation", label: "Evacuation centers", icon: Home },
      { href: "/ops/notifications", label: "Notifications", icon: Megaphone },
      { href: "/ops/sms", label: "SMS gateway", icon: MessageSquare },
      { href: "/ops/voice", label: "Voice communications", icon: Mic },
      { href: "/ops/barangays", label: "Barangays", icon: Building2 },
      { href: "/ops/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/ops/reports", label: "Reports", icon: FileStack },
      { href: "/ops/audit", label: "Audit logs", icon: ScrollText },
      { href: "/ops/system", label: "System health", icon: Server },
      { href: "/ops/media", label: "Media & evidence", icon: Archive },
      { href: "/ops/users", label: "Users & access", icon: Shield },
      { href: "/ops/settings", label: "Settings", icon: Settings },
    ],
  },
];

export const OPS_PAGE_TITLES: Record<string, string> = {
  "/ops": "Smart command center",
  "/ops/profile": "EOC user profile",
  "/ops/incidents": "Live incident management",
  "/ops/map": "Realtime GIS map",
  "/ops/dispatch": "Emergency dispatch",
  "/ops/responders": "Responder management",
  "/ops/vehicles": "Vehicle & resource tracking",
  "/ops/weather": "Weather & disaster intelligence",
  "/ops/evacuation": "Evacuation centers",
  "/ops/notifications": "Notifications & broadcasts",
  "/ops/sms": "SMS fallback",
  "/ops/voice": "Voice communications",
  "/ops/barangays": "Barangay coordination",
  "/ops/analytics": "Analytics & smart city",
  "/ops/reports": "Incident history & reports",
  "/ops/audit": "Audit logs",
  "/ops/system": "System health",
  "/ops/media": "Media & evidence",
  "/ops/users": "User & access management",
  "/ops/settings": "Console settings",
};

/** Target operational statuses (UX). Backend uses IncidentStatus / assignments — map in UI copy. */
export const TARGET_INCIDENT_LIFECYCLE = [
  "pending",
  "verified",
  "dispatched",
  "en_route",
  "on_scene",
  "transporting",
  "resolved",
  "cancelled",
] as const;

export const TARGET_RESPONDER_STATUSES = [
  "available",
  "dispatched",
  "en_route",
  "busy",
  "offline",
] as const;

/** Integrations surfaced in Weather panel */
export const WEATHER_SOURCES = ["PAGASA", "PHIVOLCS", "OpenWeatherMap", "RainViewer"] as const;
