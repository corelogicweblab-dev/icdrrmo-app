import { redirect } from "next/navigation";

/** Unified sign-in lives at `/` (IcdAuthShell template). */
export default function SignInRedirectPage(): never {
  redirect("/");
}
