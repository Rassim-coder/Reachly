import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // duckdb-async loads a native `.node` binding through CommonJS; it must be
  // required at runtime instead of being bundled by Turbopack/webpack. The
  // underlying `duckdb` package must be externalized as well.
  serverExternalPackages: ["duckdb-async", "duckdb"],
  // The search route loads DuckDB through createRequire so Turbopack does not
  // bundle its native addon. Include that external package and its pnpm-linked
  // runtime dependencies in the Vercel function trace.
  outputFileTracingIncludes: {
    "/api/businesses/search": [
      "./node_modules/duckdb-async/dist/**/*",
      "./node_modules/duckdb-async/package.json",
      "./node_modules/.pnpm/duckdb-async@*/node_modules/duckdb-async/dist/**/*",
      "./node_modules/.pnpm/duckdb-async@*/node_modules/duckdb-async/package.json",
      "./node_modules/.pnpm/duckdb-async@*/node_modules/duckdb/lib/**/*",
      "./node_modules/.pnpm/duckdb-async@*/node_modules/duckdb/package.json",
      "./node_modules/.pnpm/duckdb@*/node_modules/duckdb/lib/**/*",
      "./node_modules/.pnpm/duckdb@*/node_modules/duckdb/package.json",
      "./node_modules/.pnpm/duckdb@*/node_modules/@mapbox/node-pre-gyp/lib/**/*",
      "./node_modules/.pnpm/duckdb@*/node_modules/@mapbox/node-pre-gyp/package.json",
      "./node_modules/.pnpm/@mapbox+node-pre-gyp@*/node_modules/@mapbox/node-pre-gyp/lib/**/*",
      "./node_modules/.pnpm/@mapbox+node-pre-gyp@*/node_modules/@mapbox/node-pre-gyp/package.json",
      "./node_modules/.pnpm/@mapbox+node-pre-gyp@*/node_modules/consola/dist/**/*",
      "./node_modules/.pnpm/@mapbox+node-pre-gyp@*/node_modules/consola/package.json",
      "./node_modules/.pnpm/@mapbox+node-pre-gyp@*/node_modules/detect-libc/lib/**/*",
      "./node_modules/.pnpm/@mapbox+node-pre-gyp@*/node_modules/detect-libc/package.json",
      "./node_modules/.pnpm/@mapbox+node-pre-gyp@*/node_modules/nopt/lib/**/*",
      "./node_modules/.pnpm/@mapbox+node-pre-gyp@*/node_modules/nopt/package.json",
      "./node_modules/.pnpm/@mapbox+node-pre-gyp@*/node_modules/semver/**/*.js",
      "./node_modules/.pnpm/@mapbox+node-pre-gyp@*/node_modules/semver/package.json",
      "./node_modules/.pnpm/nopt@*/node_modules/abbrev/**/*",
      "./node_modules/.pnpm/consola@*/node_modules/consola/dist/**/*",
      "./node_modules/.pnpm/consola@*/node_modules/consola/package.json",
      "./node_modules/.pnpm/detect-libc@*/node_modules/detect-libc/lib/**/*",
      "./node_modules/.pnpm/detect-libc@*/node_modules/detect-libc/package.json",
      "./node_modules/.pnpm/nopt@*/node_modules/nopt/lib/**/*",
      "./node_modules/.pnpm/nopt@*/node_modules/nopt/package.json",
      "./node_modules/.pnpm/abbrev@*/node_modules/abbrev/**/*",
      "./node_modules/.pnpm/semver@*/node_modules/semver/**/*.js",
      "./node_modules/.pnpm/semver@*/node_modules/semver/package.json",
    ],
  },
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
