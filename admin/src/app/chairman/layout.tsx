import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Barangay Chairman — Emergency Dashboard",
  description: "ICDRRMO barangay chairman first-responder console",
};

export default function ChairmanLayout({ children }: { children: React.ReactNode }) {
  return children;
}
