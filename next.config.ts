import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  // The live site is a static export. In development the dev server also passes Bimble API
  // calls through (below), so the site works when opened through a tunnel such as ngrok.
  ...(isDev ? {} : { output: "export" as const }),
  trailingSlash: true,
  images: { unoptimized: true },
  // Tunnels used to open the dev server from another device.
  allowedDevOrigins: ["*.ngrok-free.dev", "*.ngrok-free.app", "*.ngrok.app", "*.ngrok.io"],
  // Development only: with NEXT_PUBLIC_BIMBLE_API_URL left empty, the booking page calls
  // /api/v1/... on its own origin and the dev server forwards them to Bimble, so Bimble's
  // CORS list does not need the tunnel's address.
  ...(isDev
    ? {
        // Keep /api/v1/... paths exactly as Bimble expects them (no added trailing slash).
        skipTrailingSlashRedirect: true,
        async rewrites() {
          const target = (process.env.BIMBLE_DEV_PROXY_TARGET || "https://api.bimble.pro").replace(/\/+$/, "");
          return [{ source: "/api/v1/:path*", destination: `${target}/api/v1/:path*` }];
        },
      }
    : {}),
};

export default nextConfig;
