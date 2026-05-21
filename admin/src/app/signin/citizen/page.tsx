import { redirect } from "next/navigation";

/** Legacy URL — sign-in at `/`; registration at `/citizen?register=1`. */
export default function SigninCitizenRedirectPage() {
  redirect("/citizen?register=1");
}
