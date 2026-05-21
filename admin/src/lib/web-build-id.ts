/** Baked at static export — visible on login/citizen to confirm Hosting deploy version. */
export const WEB_BUILD_ID =
  process.env.NEXT_PUBLIC_WEB_BUILD_ID?.trim() || "local-dev";
