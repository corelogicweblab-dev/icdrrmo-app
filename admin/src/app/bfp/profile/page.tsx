"use client";

import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { StaffProfilePage } from "@/components/staff-profile-page";
import { loadBfpTokens } from "@/components/agency/agency-storage";

export default function BfpProfilePage(): ReactElement {
  const [access, setAccess] = useState<string | undefined>(undefined);

  useEffect(() => {
    setAccess(loadBfpTokens()?.accessToken);
  }, []);

  return (
    <StaffProfilePage
      accessToken={access}
      backHref="/bfp"
      backLabel="BFP desk"
      portalLabel="BFP · Profile"
      signInHint="Sign in to the BFP operations desk first."
    />
  );
}
