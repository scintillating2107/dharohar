import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native / WASM packages must load from node_modules at runtime, not be bundled
  serverExternalPackages: ["@electric-sql/pglite", "sharp", "tesseract.js", "pdf-parse", "pg", "@napi-rs/canvas"],
  // SQL migrations are read from disk at startup
  outputFileTracingIncludes: {
    "/api/**/*": ["./drizzle/**/*"],
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
