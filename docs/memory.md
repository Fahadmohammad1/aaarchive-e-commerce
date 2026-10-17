# Memory — Aaarchive

Living log of where the project stands. **Every agent updates this at the end of every task** (see root `AGENTS.md`). Prefix entries with `[web]`, `[api]`, `[shared]` or `[repo]`. Keep it short, keep "In progress" current, date entries `YYYY-MM-DD`.

## Current status

- **Phase:** 0 — Foundation (see `phases.md`)
- **In progress:** nothing
- **File currently being worked on:** —

## Completed

- **2026-10-17** [docs] — Completed the six docs.
  - `rules.md` written: golden rules, approved stack, what to avoid, code rules (web/TanStack Query, api, Prisma/migrations), error codes and handling, Supabase rules, testing, security, git, AI boundaries.
  - `phases.md` written: Phases 0–7 with tasks, exit criteria and estimates; Release 2/3 backlog. Phase 0 progress ticked.
  - `PRD.md`: §8.1 stack updated (Next.js + TanStack Query / NestJS + Prisma / Supabase), §8.3 paths moved under `/api/v1`, §8.4 Prisma conditional decrement, §13 aligned with `phases.md`, post-launch tiers renamed "Release 2/3".
  - `architecture.md`: new §3.3 (Server Components vs TanStack Query) and §4.7 (Supabase + Prisma connection setup).
  - `design.md`: Tailwind v4 `@theme` mapping and the shadcn variable mapping in §12.
  - `apps/api/.env.example` shows the Supabase pooler URL formats.

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

1. [api] Receive Supabase credentials from the user → `apps/api/.env`, confirm `/health` reports `database: up`, disable the Data API.
2. [api] Prisma models from PRD §7 + first migration + seed.
3. [web] Design tokens + fonts in `app/globals.css` / `app/layout.tsx` (replace Geist), shadcn init, `lib/api/` client, `/api/v1` rewrite.
4. [repo] GitHub Actions CI: `bun install --frozen-lockfile`, `check`, `typecheck`, `test`, `build`.

## Decisions

- **2026-10-17** — Backend is a separate NestJS app (supersedes PRD §8.1/§8.3, incl. Auth.js).
- **2026-10-17** — Monorepo with Bun workspaces (`apps/web`, `apps/api`, `packages/shared`). Bun is the package manager; the apps still run on Node.
- **2026-10-17** — Biome for lint + format across the repo (double quotes, semicolons, 2 spaces). `useImportType` off in `apps/api` (Nest DI).
- **2026-10-17** — Zod v4 everywhere. Shared request schemas live in `packages/shared`, with error codes (not sentences) as messages.
- **2026-10-17** — Frontend: Next.js + **TanStack Query** for all client-side API data. Backend: NestJS + **Prisma**. Database: **Supabase** (Postgres only).
- **2026-10-17** — Web forms use React Hook Form + Zod (per the PRD).
- **2026-10-17** — Naming: "Phase 0–7" = build phases (`phases.md`); "Release 2/3" = post-launch scope tiers (PRD §4).
- **2026-10-17** [api] — Prisma pinned to 7.x (npm `latest` was 8.0.0-rc). Generated client in `src/generated/prisma`, git-ignored.

## Blockers / open questions

- API hosting (free + commercial use) not chosen.
- Waiting for Supabase credentials from the user (`DATABASE_URL` transaction pooler :6543, `DIRECT_URL` session pooler :5432).
