# Memory — Aaarchive

Living log of where the project stands. **Every agent updates this at the end of every task** (see root `AGENTS.md`). Prefix entries with `[web]`, `[api]`, `[shared]` or `[repo]`. Keep it short, keep "In progress" current, date entries `YYYY-MM-DD`.

## Current status

- **Phase:** 0 — Setup (not yet defined in `phases.md`)
- **In progress:** nothing
- **File currently being worked on:** —

## Completed

- **2026-10-17** [repo] — Converted to a monorepo: one git repo (initialised, no commits yet), Bun workspaces, Biome.
  - `aaarchive-frontend/` → `apps/web` (`@aaarchive/web`), `aaarchive-backend/` → `apps/api` (`@aaarchive/api`). Old nested `.git` dirs removed (frontend had only the create-next-app commit).
  - Root `package.json` (workspaces + scripts), `bun.lock`, `biome.json`, `.gitignore`, `.gitattributes`, `README.md`.
  - ESLint (web), oxlint + Prettier (api) removed and replaced by Biome. Whole repo reformatted.
  - Docs consolidated in `docs/`: `design.md` moved here; the two app architecture docs merged into `docs/architecture.md`; synced copies and `scripts/sync-docs.sh` deleted.
  - `AGENTS.md` (root, canonical) + short `apps/web/AGENTS.md` and `apps/api/AGENTS.md`. `CLAUDE.md` → `@AGENTS.md` at each level.
  - Verified: `bun run check`, `typecheck`, `test` (shared 12 pass, api e2e 1 pass), `build` (all three) pass. The built API boots and answers `/api/v1/health`.
- **2026-10-17** [shared] — `packages/shared` (`@aaarchive/shared`): `money` (formatTaka), `phone` (normalizeBdPhone, maskBdPhone, bdPhoneSchema), `stock` (statuses, stockStatusFor, defaults), `order` (order/payment status + method enums). Built with tsc to `dist/`, tested with `bun test`.
- **2026-10-17** [api] — NestJS 12 scaffold: `/api/v1` prefix, helmet, CORS, Swagger, Zod env validation, `ZodValidationPipe`, `AllExceptionsFilter`, Prisma 7 service (adapter-pg), `/health`, empty `src/modules/<domain>/` folders, health e2e test.
- **2026-10-17** [web] — Folder skeleton (`app/(store)`, `app/admin/(panel)`, `app/api/revalidate`, `components/*`, `lib/<module>/`), `.env.example`.

## Next up

1. Fill in `docs/rules.md` and `docs/phases.md`.
2. [api] Prisma models from PRD §7 + first migration (needs a Supabase project or local Postgres).
3. [web] Design tokens + fonts in `app/globals.css` / `app/layout.tsx` (replace Geist), shadcn init, `lib/api/` client, `/api/v1` rewrite.
4. [repo] GitHub Actions CI: `bun install --frozen-lockfile`, `check`, `typecheck`, `test`, `build`.

## Decisions

- **2026-10-17** — Backend is a separate NestJS app (supersedes PRD §8.1/§8.3, incl. Auth.js).
- **2026-10-17** — Monorepo with Bun workspaces (`apps/web`, `apps/api`, `packages/shared`). Bun is the package manager; the apps still run on Node.
- **2026-10-17** — Biome for lint + format across the repo (double quotes, semicolons, 2 spaces). `useImportType` off in `apps/api` (Nest DI).
- **2026-10-17** — Zod v4 everywhere. Shared request schemas live in `packages/shared`, with error codes (not sentences) as messages.
- **2026-10-17** — Web forms use React Hook Form + Zod (per the PRD).
- **2026-10-17** [api] — Prisma pinned to 7.x (npm `latest` was 8.0.0-rc). Generated client in `src/generated/prisma`, git-ignored.

## Blockers / open questions

- API hosting (free + commercial use) not chosen.
- No database yet: need `DATABASE_URL` / `DIRECT_URL`.
