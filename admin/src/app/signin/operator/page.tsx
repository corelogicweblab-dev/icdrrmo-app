import { redirect } from "next/navigation";

/** Legacy URL — unified sign-in is at `/`. */
export default function SigninOperatorRedirectPage() {
  redirect("/");
}
