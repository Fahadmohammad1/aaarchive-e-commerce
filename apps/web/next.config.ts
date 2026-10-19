import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Origin of the Supabase Storage bucket that serves product and content images.
const mediaBase = process.env.NEXT_PUBLIC_MEDIA_BASE_URL
  ? new URL(process.env.NEXT_PUBLIC_MEDIA_BASE_URL)
  : null;

// Content-Security-Policy (docs/rules.md §8). Scripts and styles from this
// site, Turnstile and the analytics tags (GA4, Meta Pixel, Clarity — loaded
// only when their IDs are set in Settings); images from Supabase Storage.
// 'unsafe-inline' scripts stay (decided in Phase 7, 2026-10-20): Next's inline
// bootstrap would otherwise need a per-request nonce, which makes every page
// dynamic and loses the cached static shells that keep LCP low.
const TURNSTILE = "https://challenges.cloudflare.com";
const ANALYTICS_SCRIPTS =
  "https://www.googletagmanager.com https://connect.facebook.net https://www.clarity.ms https://*.clarity.ms";
const ANALYTICS_CONNECT =
  "https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://www.facebook.com https://*.clarity.ms https://c.bing.com";
const ANALYTICS_IMAGES =
  "https://*.google-analytics.com https://www.googletagmanager.com https://www.facebook.com https://*.clarity.ms https://c.bing.com";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${TURNSTILE} ${ANALYTICS_SCRIPTS}${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob:${mediaBase ? ` ${mediaBase.origin}` : ""} ${ANALYTICS_IMAGES}`,
  "font-src 'self'",
  `connect-src 'self' ${TURNSTILE} ${ANALYTICS_CONNECT}${isDev ? " ws: wss:" : ""}`,
  "frame-ancestors 'none'",
  `frame-src ${TURNSTILE}`,
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(isDev
    ? []
    : [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]),
  // Test deployments (architecture §8.1) must stay out of search results.
  ...(process.env.SITE_NOINDEX === "1"
    ? [{ key: "X-Robots-Tag", value: "noindex, nofollow" }]
    : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  // Storefront catalog reads (lib/<module>/*-store-api.ts). Admin edits
  // refresh them at once through cache tags; the short revalidate covers what
  // no webhook announces, such as a sale window opening or closing.
  cacheLife: {
    catalog: { stale: 60, revalidate: 300, expire: 86_400 },
  },
  partialPrefetching: true,
  images: {
    // Next 16 requires an explicit allowlist of qualities. Patterns omit
    // `search` so query strings (resize params) are allowed.
    qualities: [60, 75],
    remotePatterns: [
      // Product and content images (production).
      ...(mediaBase
        ? [
            {
              protocol: "https" as const,
              hostname: mediaBase.hostname,
              pathname: `${mediaBase.pathname}/**`,
            },
          ]
        : []),
    ],
  },
  // Same-origin API proxy (docs/architecture.md §3.4): the browser calls
  // /api/v1/*, Next forwards it to the NestJS API. Keeps the refresh cookie
  // first-party and the storefront free of CORS.
  async rewrites() {
    const target =
      process.env.API_PROXY_TARGET ?? "http://localhost:4000/api/v1";
    return [{ source: "/api/v1/:path*", destination: `${target}/:path*` }];
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
