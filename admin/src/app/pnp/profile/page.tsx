"use client";

import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { StaffProfilePage } from "@/components/staff-profile-page";
import { loadPnpTokens } from "@/components/agency/agency-storage";

export default function PnpProfilePage(): ReactElement {
  const [access, setAccess] = useState<string | undefined>(undefined);

  useEffect(() => {
    setAccess(loadPnpTokens()?.accessToken);
  }, []);

  return (
    <StaffProfilePage
      accessToken={access}
      backHref="/pnp"
      backLabel="PNP desk"
      portalLabel="PNP · Profile"
      signInHint="Sign in to the PNP operations desk first."
    />
  );
}
