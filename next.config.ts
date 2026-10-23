import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // duckdb-async loads a native `.node` binding through CommonJS; it must be
  // required at runtime instead of being bundled by Turbopack/webpack. The
  // underlying `duckdb` package must be externalized as well.
  serverExternalPackages: ["duckdb-async", "duckdb"],
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
