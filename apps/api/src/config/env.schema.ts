import { z } from "zod";

// Every env var the API reads. Validated once at boot: a missing or malformed
// value stops the app instead of failing on the first request that needs it.
export const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),

  // Pooled connection for the running app (Supabase pooler).
  DATABASE_URL: z.url(),
  // Direct connection for migrations; read by prisma.config.ts only.
  DIRECT_URL: z.url().optional(),

  // Origin allowed by CORS. In production the frontend reaches the API through
  // its same-origin /api/v1 rewrite, so this only matters for local tooling.
  FRONTEND_ORIGIN: z.url().default("http://localhost:3000"),

  // Frontend cache webhook (POST /api/revalidate) and its shared secret.
  FRONTEND_REVALIDATE_URL: z.url().optional(),
  REVALIDATE_SECRET: z.string().min(16).optional(),

  // Shared secret the web app's proxy.ts adds to every request it forwards
  // (header x-aaarchive-proxy). When set, requests without it are refused, so
  // the API cannot be called around the website (docs/rules.md §8).
  // Required in production.
  API_PROXY_SECRET: z.string().min(32).optional(),

  // Number of reverse proxies in front of the API (web server, CDN…), so
  // req.ip is the visitor and not the proxy. 0 = trust none (local dev).
  TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(0),

  // Global rate limit per client IP (stricter limits sit on login, checkout…).
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(120),
  THROTTLE_TTL_SECONDS: z.coerce.number().int().positive().default(60),

  // ── Auth (rules.md §8.2) ──
  // HMAC key for access tokens. Generate: openssl rand -hex 32
  JWT_ACCESS_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce
    .number()
    .int()
    .min(60)
    .max(3600)
    .default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(60).default(14),
  LOGIN_MAX_ATTEMPTS: z.coerce.number().int().min(3).max(20).default(5),
  LOGIN_LOCK_MINUTES: z.coerce.number().int().min(1).max(1440).default(15),
  // Cloudflare Turnstile secret. Unset locally = check skipped; required in production.
  TURNSTILE_SECRET_KEY: z.string().optional(),

  // ── Media: Supabase Storage via its S3 API (architecture §4.7a) ──
  // Storage-only keys. Unset locally = uploads answer 503; required in production.
  MEDIA_S3_ENDPOINT: z.url().optional(),
  MEDIA_S3_REGION: z.string().min(1).optional(),
  MEDIA_S3_ACCESS_KEY_ID: z.string().min(1).optional(),
  MEDIA_S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  MEDIA_BUCKET: z.string().min(1).default("media"),
  MEDIA_PUBLIC_BASE_URL: z.url().optional(),
});

export type Env = z.infer<typeof envSchema>;

const productionRules = envSchema.superRefine((env, ctx) => {
  if (env.NODE_ENV !== "production") return;
  if (!env.API_PROXY_SECRET) {
    ctx.addIssue({
      code: "custom",
      path: ["API_PROXY_SECRET"],
      message: "Required in production",
    });
  }
  if (!env.TURNSTILE_SECRET_KEY) {
    ctx.addIssue({
      code: "custom",
      path: ["TURNSTILE_SECRET_KEY"],
      message: "Required in production",
    });
  }
  for (const key of [
    "MEDIA_S3_ENDPOINT",
    "MEDIA_S3_REGION",
    "MEDIA_S3_ACCESS_KEY_ID",
    "MEDIA_S3_SECRET_ACCESS_KEY",
    "MEDIA_PUBLIC_BASE_URL",
  ] as const) {
    if (!env[key]) {
      ctx.addIssue({
        code: "custom",
        path: [key],
        message: "Required in production",
      });
    }
  }
  if (!env.REVALIDATE_SECRET) {
    ctx.addIssue({
      code: "custom",
      path: ["REVALIDATE_SECRET"],
      message: "Required in production",
    });
  }
});

export function validateEnv(raw: Record<string, unknown>): Env {
  // `KEY=` in .env means "not set" (that is how .env.example lists optional
  // values), so empty strings must not fail validation as too short.
  const cleaned = Object.fromEntries(
    Object.entries(raw).filter(([, value]) => value !== ""),
  );
  const result = productionRules.safeParse(cleaned);
  if (!result.success) {
    throw new Error(
      `Invalid environment variables:\n${z.prettifyError(result.error)}`,
    );
  }
  return result.data;
}
