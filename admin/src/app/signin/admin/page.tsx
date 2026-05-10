import { redirect } from "next/navigation";

/** Legacy URL — desk sign-in lives at `/signin/operator`. */
export default function SigninAdminRedirectPage() {
  redirect("/signin/operator");
}
