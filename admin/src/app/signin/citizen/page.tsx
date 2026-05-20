import { redirect } from "next/navigation";

/** Legacy URL — unified sign-in is at `/`; citizen registration at `/citizen`. */
export default function SigninCitizenRedirectPage() {
  redirect("/");
}
