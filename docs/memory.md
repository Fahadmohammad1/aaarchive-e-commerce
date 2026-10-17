# Memory — Aaarchive

Living log of where the project stands. **Every agent updates this at the end of every task** (see root `AGENTS.md`). Prefix entries with `[web]`, `[api]`, `[shared]` or `[repo]`. Keep it short, keep "In progress" current, date entries `YYYY-MM-DD`.

## Current status

- **Phase:** 0 — Foundation (see `phases.md`)
- **In progress:** [web] Home page design review by the user, round 3 (out of phase order: home sections belong to Phase 6, built early on request)
- **File currently being worked on:** `apps/web/app/(store)/page.tsx` and `apps/web/app/(store)/_components/*`

## Completed

- **2026-10-17** [web] — Home sections, round 3 (user feedback: round 2 changed too much and lost the fashion feel).
  - Restored the previous `social-section.tsx` ("Follow our style journey" slider) and `site-footer.tsx` (logo, wide image, policy chips, cream bar) with their fixture data.
  - Restyled the four middle sections, image-led: `category-section.tsx` (bento of category photos; `category-index.tsx` removed), `look-file-section.tsx` (photo with numbered hotspots + piece cards), `collections-section.tsx` ("Winter drop" campaign tile + product grid; entry numbers and see-all tile removed), `made-to-keep-section.tsx` (full-width campaign photo with overlaid heading/promises).
  - `ProductCard` back to `portrait | large` (dropped `entry` and `fill`). Fixtures: `lookFile.items[].hotspot`, `latestCampaign`.
  - design.md §1.2, §1.3 rows 12–16, §6.3–6.8 rewritten.
  - Verified: Biome, typecheck; Playwright screenshots at 1440px and 390px.

- **2026-10-17** [web] — Home sections below the hero redesigned to stop copying the reference (user request; hero unchanged).
  - New: `category-index.tsx` + `category-section.tsx` ("The archive index"), `look-file-section.tsx` ("Look file No. 01"), `collections-section.tsx` ("Latest entries": chip filters, 2×2 lead, numbered cards, see-all tile), `made-to-keep-section.tsx` ("Made to be kept": care-label cards), `social-section.tsx` ("Worn by you": square grid), `site-footer.tsx` (directory footer). Removed `featured-look-section.tsx`, `why-us-section.tsx`.
  - `ProductCard` gained `entry` (No. 001) and `aspect="fill"`. Fixtures renamed (`lookFile`, `madeToKeep`) with new copy; fixed bucket-hat/accessories placeholder images. New i18n strings.
  - `ScrollSlider` and `CategoryCard` are no longer used on the home page; kept for the product page "You may also like" slider and shop pages.
  - design.md §1.2, §1.3 (rows 12–17), §6.3–6.8 rewritten.
  - Verified: Biome, typecheck; Playwright screenshots at 1440px and 390px.

- **2026-10-17** [web] — Logo in use; brand name removed from the footer (user request).
  - From `public/logo.png` (1536×1024, black bg) made transparent cuts `public/images/logo-wordmark.png` (1216×418) and `logo-full.png` (1224×591, with tagline) — black converted to alpha by brightness, done in headless Chromium (no new dependency). Originals untouched.
  - `components/store/logo.tsx`. Header and menu overlay show the wordmark; footer shows the full logo in place of the "AAARCHIVE" heading, and the giant filled wordmark at the footer bottom is removed (only the © line names the brand). Wordmark `filled` variant and its CSS deleted.
  - Docs: design.md §1.4 (logo row), §5.16, §6.1, §6.8, §13; architecture.md tree.

- **2026-10-17** [web] — Home page UI (design §6) on fixture data, for design review.
  - shadcn/ui initialised (`components.json`: Radix, `radix-nova`, Lucide). Added `button`, `badge`, `tabs`, `sheet`. Custom variants: Button `cream`, Badge `sale`, `stock-out`. New deps: `radix-ui`, `lucide-react`, `class-variance-authority`, `cn`, `tw-animate-css`, `shadcn`.
  - `app/globals.css`: design tokens mapped onto shadcn variables (marigold = `primary`), type-scale utilities, grain, spotlight, wordmark, kantha stitch, reduced motion. `app/layout.tsx`: Alfa Slab One, JetBrains Mono, Inter, Hind Siliguri via `next/font`, `<html class="dark">`.
  - `components/store/`: tag, arrow-button, index-markers, kantha-divider, wordmark, section-heading, color-swatches, product-card, category-card, scroll-slider.
  - `app/(store)/layout.tsx` + `_components/`: site-header (Sheet menu), announcement-bar, floating-contact, hero, category, featured-look, collections (Tabs + masonry), why-us, social, site-footer.
  - `lib/i18n/{en,i18n}.ts`, `lib/content/home-fixtures.ts` (Unsplash placeholders, requested at w=1600 so the Next image optimizer doesn't time out on originals). `next.config.ts`: image `qualities` + remote patterns (Cloudinary, Unsplash dev-only).
  - Verified: Biome, typecheck, `next build` (home is static). Checked with Playwright screenshots at 1440px and 390px; menu opens/closes (Escape), slider arrows and tabs work.
  - Docs: design.md §5.9 + new §12.1 (token → shadcn mapping), rules.md (shadcn everywhere, Lucide only), architecture.md (stack, tree), PRD §8.1 UI row, apps/web/AGENTS.md.

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

0. [web] Apply the user's feedback on the home page design.
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
- **2026-10-17** [web] — shadcn/ui is the component base for storefront **and** admin (user decision), with its Lucide icons. Supersedes "storefront never imports components/ui". Social links use text chips (Lucide has no brand logos).
- **2026-10-17** [web] — Dev placeholder images from Unsplash (user decision), never shipped.
- **2026-10-17** — Naming: "Phase 0–7" = build phases (`phases.md`); "Release 2/3" = post-launch scope tiers (PRD §4).
- **2026-10-17** [api] — Prisma pinned to 7.x (npm `latest` was 8.0.0-rc). Generated client in `src/generated/prisma`, git-ignored.

## Blockers / open questions

- [web] `next.config.ts` has `experimental.agentFeedback: true` (from create-next-app). It makes `next dev` add a block to `apps/web/AGENTS.md` asking agents to send feedback to the Next.js team. Agents must not send anything without the user's approval. Ask whether to turn it off.
- [web] Logo is a raster PNG cut-out; an SVG (or transparent PNG) from the designer would be sharper. No favicon/monogram yet. No real product/campaign photos yet; men's panjabi placeholder is a white-tee photo.

- API hosting (free + commercial use) not chosen.
- Waiting for Supabase credentials from the user (`DATABASE_URL` transaction pooler :6543, `DIRECT_URL` session pooler :5432).
