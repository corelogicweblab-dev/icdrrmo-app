import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "SMART Citizen Dashboard — ICDRRMO",
  description:
    "SMART Citizen Dashboard — SOS lifecycle, Windy map, evacuation, community feed, ICDRRMO AI.",
};

/** Route layout — metadata ensures static export HTML includes SMART citizen marker for CI. */
export default function CitizenLayout(props: { children: ReactNode }) {
  return <>{props.children}</>;
}
