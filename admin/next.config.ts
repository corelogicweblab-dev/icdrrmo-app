import type { NextConfig } from "next";

/** Server-side proxy target (not exposed to browser). Docker build: `http://api:4000`. */
const backendProxy =
  process.env.BACKEND_PROXY_TARGET?.replace(/\/$/, "") ?? "http://127.0.0.1:4000";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["mapbox-gl"],
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
};

export default nextConfig;
