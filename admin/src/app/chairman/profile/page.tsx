"use client";

import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { StaffProfilePage } from "@/components/staff-profile-page";
import { loadChairmanTokens } from "@/components/chairman/chairman-storage";

export default function ChairmanProfilePage(): ReactElement {
  const [access, setAccess] = useState<string | undefined>(undefined);

  useEffect(() => {
    setAccess(loadChairmanTokens()?.accessToken);
  }, []);

  return (
    <StaffProfilePage
      accessToken={access}
      backHref="/chairman"
      backLabel="Chairman console"
      portalLabel="Barangay chairman · Profile"
      signInHint="Sign in to the barangay chairman console first."
      requireBarangay
    />
  );
}
