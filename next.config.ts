import type { NextConfig } from "next";

import { securityHeaders } from "./src/lib/security-headers";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Security headers on every response (D-039). Vercel adds HSTS itself.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders({
          isDev: process.env.NODE_ENV === "development",
          // Only Vercel serves HTTPS; local production builds (E2E) run on http://127.0.0.1.
          upgradeInsecureRequests: process.env.VERCEL === "1",
        }),
      },
    ];
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
