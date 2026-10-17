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
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(
      `Invalid environment variables:\n${z.prettifyError(result.error)}`,
    );
  }
  return result.data;
}
