import type { NextConfig } from "next";

/**
 * `STATIC_EXPORT=1 npm run build` emits a fully static site to ./out that can be
 * zipped, opened from any static host, or drag-dropped onto Netlify/S3/Pages.
 * Normal dev/build is unaffected.
 */
const nextConfig: NextConfig = {
  ...(process.env.STATIC_EXPORT === "1"
    ? { output: "export" as const, images: { unoptimized: true } }
    : {}),
};

export default nextConfig;
