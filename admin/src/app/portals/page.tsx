import { redirect } from "next/navigation";

/** Role shortcuts removed — unified sign-in at `/` routes by credential. */
export default function PortalsPage(): never {
  redirect("/");
}
