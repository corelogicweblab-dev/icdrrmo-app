import { redirect } from "next/navigation";

/** Historical URL — avoids bookmark + SW cache ambiguity. Canonical console is `/ops`. */
export default function DashboardRedirect(): never {
  redirect("/ops");
}
