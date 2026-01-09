// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Explicitly enable Turbopack
   * (silences the error and aligns with Next.js 16)
   */
  turbopack: {},

  /**
   * Prevent source map issues in dev
   */
  productionBrowserSourceMaps: false,

  async headers() {
    return [
      {
        // Allow API access
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
        ],
      },
      {
        // Disable caching for dashboard pages
        source: "/dashboard/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          { key: "Pragma", value: "no-cache" },
          { key: "Expires", value: "0" },
        ],
      },
    ];
  },
};

export default nextConfig;
