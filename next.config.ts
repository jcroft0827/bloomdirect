// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Explicitly enable Turbopack
   * (silences the error and aligns with Next.js 16)
   */
  turbopack: {},

  /**
   * ssh2 / ssh2-sftp-client use Node-specific crypto and native-style assets
   * that Turbopack should not attempt to bundle into ESM chunks.
   *
   * Keep these packages external so the Node.js runtime resolves them
   * normally inside the server function.
   */
  serverExternalPackages: ["ssh2-sftp-client", "ssh2"],

  /**
   * Prevent source map issues in dev
   */
  productionBrowserSourceMaps: false,

  async headers() {
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(self), microphone=(), geolocation=(self)",
      },
      ...(process.env.NODE_ENV === "production"
        ? [
            {
              key: "Strict-Transport-Security",
              value: "max-age=31536000",
            },
          ]
        : []),
    ];

    return [
      {
        source: "/:path*",
        headers: securityHeaders,
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
