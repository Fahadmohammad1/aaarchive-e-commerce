# Agent Guide — apps/api (NestJS REST API)

**Read the root `AGENTS.md` first.** It holds the six-doc workflow, project context, non-negotiables and repo commands. This file only adds what is specific to `apps/api`. Details: `docs/architecture.md` §4.

## Essentials

- NestJS 12, **ESM**: relative imports end in `.js`. TypeScript 6 strict (`nodenext`).
- All routes live under `/api/v1`, Swagger at `/api/docs` (non-production), health at `GET /api/v1/health`.
- **Prisma 7** with `@prisma/adapter-pg`. The client is generated into `src/generated/prisma` (git-ignored). Import types from `../generated/prisma/client.js`, inject `PrismaService`, never `new PrismaClient()`, never edit generated files.
- **Supabase is only Postgres.** `DATABASE_URL` = transaction pooler (6543), `DIRECT_URL` = session pooler (5432). No `supabase-js`, Supabase Auth or Storage. Never print or commit the credentials. See `docs/architecture.md` §4.7 and `docs/rules.md` §6.
- **Zod v4** for env (`src/config/env.schema.ts`) and requests (`ZodValidationPipe`), not class-validator. Schemas both apps use come from `@aaarchive/shared/<topic>`.
- Errors: throw `HttpException`s with a `code` the web can branch on. `AllExceptionsFilter` shapes every error as `{ statusCode, message, code?, details? }`.
- Domain modules live in `src/modules/<name>/`: `.module.ts`, thin `.controller.ts`, logic in `.service.ts`, `.schemas.ts`, `.mapper.ts`. Public and admin controllers are separate, and a public mapper never spreads a Prisma row (stock numbers must not leak).
- **Do not use `import type` for anything Nest injects** (services, `ConfigService`…). DI needs the runtime import. Biome's `useImportType` is off here for that reason.
- Business rules enforced here: `docs/architecture.md` §4.5 (atomic stock decrement, server-side prices, stock restore, unique TrxID, rate limits, blocklist).
- When you add or change an endpoint or response shape, update `docs/architecture.md` §4.6 and the web code that consumes it in the same change.

## Commands (from the repo root)

```bash
bun run dev:api                                     # http://localhost:4000/api/v1
bun run --filter @aaarchive/api test                # vitest unit
bun run --filter @aaarchive/api test:e2e            # vitest e2e (no DB needed for /health)
bun run --filter @aaarchive/api db:migrate          # prisma migrate dev — local DB only
bun run --filter @aaarchive/api db:generate
```

Environment: copy `apps/api/.env.example` → `apps/api/.env`.
