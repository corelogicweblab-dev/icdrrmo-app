import { NextResponse, type NextRequest } from "next/server";

/** Prevent stale HTML / flight payload on primary human routes (fixes “frozen” scaffold UI). */
export function middleware(req: NextRequest): NextResponse {
  void req;
  const res = NextResponse.next();
  res.headers.set("Cache-Control", "private, no-cache, no-store, must-revalidate");
  res.headers.set("Pragma", "no-cache");
  return res;
}

export const config = {
  matcher: [
    "/",
    "/citizen",
    "/citizen/:path*",
    "/chairman",
    "/chairman/:path*",
    "/ops",
    "/ops/:path*",
    "/dashboard",
    "/dashboard/:path*",
  ],
};
