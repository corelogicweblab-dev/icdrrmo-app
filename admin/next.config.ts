import type { NextConfig } from "next";

/** Server-side proxy target (not exposed to browser). Docker build: `http://api:4000`. */
const backendProxy =
  process.env.BACKEND_PROXY_TARGET?.replace(/\/$/, "") ?? "http://127.0.0.1:4000";

const isDocker = process.env.DOCKER_BUILD === "1";
const isStaticExport = process.env.STATIC_EXPORT === "1";

if (isStaticExport) {
  const api = process.env.NEXT_PUBLIC_API_URL?.trim() ?? "";
  const ws = process.env.NEXT_PUBLIC_WS_URL?.trim() ?? "";
  const absolute = (u: string) => /^https?:\/\//i.test(u) && !u.startsWith("/");
  if (!absolute(api)) {
    throw new Error(
      "[STATIC_EXPORT] NEXT_PUBLIC_API_URL must be an absolute URL to your Nest API (e.g. https://api.example.com/api/v1). " +
        "Relative /api/v1 only works with local Next rewrites and causes HTTP 404 on Firebase static hosting.",
    );
  }
  if (!absolute(ws)) {
    throw new Error(
      "[STATIC_EXPORT] NEXT_PUBLIC_WS_URL must be an absolute Socket.IO origin (e.g. https://api.example.com). " +
        "Leaving it unset makes the client use this site’s origin, which has no /socket.io server on static hosting.",
    );
  }
}

const nextConfig: NextConfig = {
  ...(isDocker ? { output: "standalone" as const } : {}),
  ...(isStaticExport ? { output: "export" as const } : {}),
  transpilePackages: ["mapbox-gl"],
  ...(!isStaticExport
    ? {
        async rewrites() {
          return [
            {
              source: "/socket.io/:path*",
              destination: `${backendProxy}/socket.io/:path*`,
            },
            {
              source: "/api/v1/:path*",
              destination: `${backendProxy}/api/v1/:path*`,
            },
          ];
        },
      }
    : {}),
};

export default nextConfig;
