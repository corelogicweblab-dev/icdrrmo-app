import { BFP_STORAGE_KEY, PNP_STORAGE_KEY } from "@/components/agency/agency-storage";

export type AgencyRole = "PNP" | "BFP";

export type AgencyPortalConfig = {
  role: AgencyRole;
  storageKey: string;
  basePath: "/pnp" | "/bfp";
  portalTitle: string;
  portalSubtitle: string;
  loginHeroTitle: string;
  loginHeroLead: string;
  deskPageTitle: string;
  incidentQueueLabel: string;
};

export const PNP_AGENCY_CONFIG: AgencyPortalConfig = {
  role: "PNP",
  storageKey: PNP_STORAGE_KEY,
  basePath: "/pnp",
  portalTitle: "PNP Operations Desk",
  portalSubtitle: "Philippine National Police — crime incidents forwarded by ICDRRMO EOC",
  loginHeroTitle: "PNP agency console",
  loginHeroLead:
    "Same ICDRRMO command shell as EOC: live incident queue, map, voice bridge, and profile — scoped to police-forwarded cases.",
  deskPageTitle: "Agency desk",
  incidentQueueLabel: "Forwarded incidents (crime / police)",
};

export const BFP_AGENCY_CONFIG: AgencyPortalConfig = {
  role: "BFP",
  storageKey: BFP_STORAGE_KEY,
  basePath: "/bfp",
  portalTitle: "BFP Operations Desk",
  portalSubtitle: "Bureau of Fire Protection — fire incidents forwarded by ICDRRMO EOC",
  loginHeroTitle: "BFP agency console",
  loginHeroLead:
    "Same ICDRRMO command shell as EOC: live incident queue, map, voice bridge, and profile — scoped to fire-forwarded cases.",
  deskPageTitle: "Agency desk",
  incidentQueueLabel: "Forwarded incidents (fire)",
};
