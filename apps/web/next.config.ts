import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // Next 16 requires an explicit allowlist of qualities. Patterns omit
    // `search` so query strings (resize params) are allowed.
    qualities: [60, 75],
    remotePatterns: [
      // Product and content images (production).
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" },
      // Development placeholders only (design.md §9) — remove before launch.
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
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
