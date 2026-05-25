/** API issues `accessToken` only (JWT_ACCESS_SECRET). `refreshToken` is optional for older stored sessions. */
export type TokenPair = { accessToken: string; refreshToken?: string };

export type OpsIncident = {
  id: string;
  type: string;
  status: string;
  createdAt: string;
  title?: string | null;
  description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  batteryLevel?: number | null;
  signalStrength?: number | null;
  channel?: string;
  reporter?: {
    id: string;
    email: string;
    phone?: string | null;
    profile?: {
      firstName?: string | null;
      lastName?: string | null;
      barangayId?: string | null;
      fullName?: string | null;
    } | null;
  } | null;
  assigned?: {
    id: string;
    user: { id: string; email: string };
  } | null;
  assignedResponderId?: string | null;
  routedAgency?: string | null;
  routedAgencyOverride?: boolean;
  barangayId?: string | null;
  barangay?: { id: string; name: string; code: string } | null;
};
