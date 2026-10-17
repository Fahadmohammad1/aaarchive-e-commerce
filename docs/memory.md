# Memory — Aaarchive

Living log of where the project stands. **Every agent updates this at the end of every task** (see root `AGENTS.md`). Prefix entries with `[web]`, `[api]`, `[shared]` or `[repo]`. Keep it short, keep "In progress" current, date entries `YYYY-MM-DD`.

## Current status

- **Phase:** 2 — Admin dashboard & catalog management (see `phases.md`)
- **In progress:** Phase 2 — first slice done (shell, categories, collections, sizes, colours, revalidation). Next: size charts, then products + variants.
- **File currently being worked on:** — (next: `apps/api/src/modules/size-charts/`)

## Completed

- **2026-10-19** [api][web][shared] — Phase 2, first slice: admin shell + categories, collections, sizes, colours + storefront revalidation.
  - Shared: `@aaarchive/shared/catalog` (`slugSchema`, `slugify`, create/update schemas — update schemas carry no defaults because Zod 4 fills defaults inside `.partial()`), `@aaarchive/shared/cache-tags` (tag names + revalidate header). 15 new tests (42 total).
  - API: migration `20261019000000_catalog_images` (additive: `Category`/`Collection.imageId` → `MediaAsset` Restrict, `imageAlt`; `Collection.showOnHome`), applied to a local Postgres with no drift — **not applied to Supabase** (needs the user's go-ahead). Modules `categories`, `collections`, `sizes`, `colors` (admin controllers: reads OWNER/STAFF, writes OWNER; `409 SLUG_TAKEN / NAME_TAKEN / CATEGORY_IN_USE / SIZE_IN_USE / COLOR_IN_USE`, `400 MEDIA_NOT_FOUND`), global `revalidation` (`RevalidationService`), `common/slug/unique-slug.ts`, `common/prisma/prisma-errors.ts`; `MediaService.assertExists/toImageRef`, media delete also checks categories/collections. Tests: 7 new unit (30 total), `test/catalog.e2e-spec.ts` 7 cases (22 e2e total). `createUser()` test helper takes an email domain so parallel suites' clean-ups no longer delete each other's users.
  - Web: admin shell (`admin-shell.tsx`, `admin-nav.ts`, `admin-nav-list.tsx`, new `admin-top-bar.tsx` with user menu, mobile Sheet), dashboard placeholder links to the catalog; screens `/admin/categories`, `/admin/collections`, `/admin/sizes`, `/admin/colors` (Owner edits, Staff read-only); `components/admin/*` (page-header, list-state, form-field, switch-field, confirm-delete-dialog, image-picker, group-thumb, catalog-group-form-dialog); `lib/{category,collection,size,color,upload}` modules; `lib/api/paged.ts`, `lib/i18n/error-text.ts`; `app/api/revalidate/route.ts`. shadcn primitives dialog, alert-dialog, dropdown-menu, switch, textarea, table, skeleton written by hand from shadcn's source (registry host `ui.shadcn.com` blocked here). `globals.css`: admin variables also on `html:has(.admin)` so portalled dialogs/menus get Inter + 4px radius. `export const instant = false` on the panel layout and pages (client-gated, Next's instant-navigation check cannot render them).
  - Verified in Chromium (Playwright) at 1440px and 375px against a local API + Postgres: sign-in, create/edit/delete categories, slug clash + invalid slug messages, collection hidden badge, colour picker, sizes list, sidebar collapse, user menu, mobile menu; API → web `/api/revalidate` 204 on every write; route rejects missing/wrong secret (401) and bad body (400). Found + fixed: sticky table header covered the first row (inside the scroll container), portals lost the admin font/radius, actions off-screen at 375px. Not verified: photo upload (no Supabase S3 keys in this environment).

- **2026-10-18** [api][web][shared] — Media upload pipeline live on Supabase Storage.
  - Bucket `media` set public / `image/webp` / 2 MB (SQL on `storage.buckets`); derived `MEDIA_S3_ENDPOINT`, `MEDIA_S3_REGION` (ap-southeast-2), `MEDIA_PUBLIC_BASE_URL` into `apps/api/.env` and `NEXT_PUBLIC_MEDIA_BASE_URL` into `apps/web/.env.local` (user added the S3 keys).
  - Deps: `sharp` 0.35.5, `@aws-sdk/client-s3`, `@types/multer`. Migration `20261018150000_media_assets` applied to Supabase (MediaAsset RLS on, anon no access).
  - Shared `@aaarchive/shared/media` (purposes, widths, limits, `mediaAssetSchema`, `pickRendition`; 2 tests). API `modules/media`: `media-pipeline.ts` (decode-checked JPG/PNG/WebP, 40 MP cap, min side 200, rotate, metadata stripped, WebP 400–1600 + 16 px blur, ≤ 2 MB per rendition), `MediaStorageService` (S3, `Cache-Control: public, max-age=86400`), `MediaService` (upload with clean-up on failure, list, delete only when unreferenced by products/content/settings), `MediaController` (`/admin/media`, 8 MB multer limit, 30/min). 9 pipeline unit tests.
  - Verified on Supabase: upload 201 → 4 renditions served publicly as WebP with no EXIF/marker; disguised PHP → 400 UNSUPPORTED_IMAGE; anonymous → 401; delete → bucket and DB empty. Found: Supabase CDN keeps serving deleted objects from cache → cache lifetime cut from 1 year to 1 day; Cloudflare purge-on-delete added to Phase 7.
  - Web: `components/store/media-image.tsx` (`<img srcset>`, blur background).

- **2026-10-18** [repo] — Media moves to **Supabase Storage** (user decision; Cloudinary dropped). Design: uploads go through the API (`POST /admin/media`): `sharp` content check, 40 MP cap, EXIF/GPS strip, WebP 400/800/1200/1600 + blur, stored via Supabase's S3 API with storage-only keys in a public `media` bucket (webp only, 2 MB); `MediaAsset` table referenced by `ProductImage.mediaId` and content `{ mediaId, alt }`; production serves `/media/*` through Cloudflare cache to protect free egress.
  - Docs: PRD §6.7/§8.1/§8.3/§9.3, architecture §4.7a (new) + diagram/stack, rules (stack, avoid-table, §6 Supabase, §8.4 uploads, §8.6), phases (Phase 2 media tasks, Phase 7 media CDN + clean-up).
  - Code: shared `imageSchema` → `{ mediaId, alt }`; Prisma `MediaAsset` + `ProductImage.mediaId` (Restrict); migration `20261018150000_media_assets` generated offline from a schema diff (ProductImage verified empty on Supabase; `prisma dev` kept hanging, so not applied locally — CI applies it on its Postgres); `next.config.ts` image allowlist + CSP from `NEXT_PUBLIC_MEDIA_BASE_URL`; `.env.example` (API `MEDIA_S3_*`, `MEDIA_BUCKET`, `MEDIA_PUBLIC_BASE_URL`; web `NEXT_PUBLIC_MEDIA_BASE_URL`).

- **2026-10-18** [api] — Phase 1 live on Supabase: migration `20261018140000_auth_sessions` applied (4 migrations total); first Owner created by `db:seed` from `SEED_OWNER_*` (argon2id, active). Verified against Supabase: login 200, `/auth/me` 200, logout 204, same access token afterwards 401. User asked to remove `SEED_OWNER_PASSWORD` from `.env` after saving the password.

- **2026-10-18** [api][web][shared] — Phase 1 authentication (rules.md §8.2–8.3).
  - Shared `@aaarchive/shared/auth`: login/change-password/session schemas, roles, `isStaffRole` (3 tests).
  - API: migration `20261018140000_auth_sessions` (User lockout/`tokenVersion`/`lastLoginAt`, `RefreshToken` + RLS); `modules/auth` (login, refresh with rotation + reuse detection + 10 s grace, logout, logout-all, me, change-password), `TurnstileService`, `password-policy.ts`; global `JwtAuthGuard` + `RolesGuard` (default OWNER/STAFF), `SameOriginGuard` (non-GET), `cookie-parser`; env: `JWT_ACCESS_SECRET` (required), TTLs, lockout, `TURNSTILE_SECRET_KEY` (required in prod); seed creates the first Owner from `SEED_OWNER_*`. Deps: `@nestjs/jwt`, `@node-rs/argon2`, `cookie-parser`.
  - Tests: unit 14 (policy, Turnstile, env), e2e 15 against a real DB (generic errors, CSRF, cookie flags, rotation, theft → family revoked, logout immediate, default-deny 401/403/200, forged JWT, weak password + other sessions ended, lockout). CI runs them on its Postgres.
  - Web: `/admin/login` (RHF + shared Zod, Turnstile widget, `?next=` via `safeNextPath`), `AuthProvider`/`useAuth`, `lib/auth/*`, `proxy.ts` admin redirect, `app/admin/layout.tsx` (noindex, `.admin` scope: 4px radius + Inter for display/heading), `(panel)` with `RequireAdmin`, top bar, placeholder dashboard, `/admin/account` (change password, sign out everywhere). shadcn `input`, `label`, `card`. CSP allows only `challenges.cloudflare.com` for Turnstile.
  - Verified in a browser (Playwright) against a local DB with Turnstile test keys: guest redirect, wrong password message, sign-in, reload keeps session, refresh cookie invisible to JS, weak-password message, sign-out redirect, no CSP violations, per-IP login limit message. Found + fixed: Origin check wrongly applied to GETs; double session restore in React dev (now single-flight); admin titles in slab font (re-declared `--font-display`/`--font-heading` in `.admin`).
  - Generated a dev `JWT_ACCESS_SECRET` into `apps/api/.env` (value not printed).

- **2026-10-18** [api] — Supabase live: 3 migrations applied (`init`, `content_blocks_faq`, `lock_down_supabase_roles`) + seed (11 sizes, 8 colours, 3 zones, 6 settings, 5 content blocks). Verified: 24 tables incl. `_prisma_migrations` have RLS; `anon`/`authenticated` can touch 0 tables / 0 sequences; order numbers start at 24101.
- **2026-10-18** [repo] — Security baseline (user requirement: real customers, must resist attackers):
  - API: `ProxySecretMiddleware` (`x-aaarchive-proxy`, constant-time, /health exempt), global `@nestjs/throttler` (120/min/IP), JSON/urlencoded body ≤ 100 KB, `trust proxy` from `TRUST_PROXY`, production refuses to boot without `API_PROXY_SECRET`/`REVALIDATE_SECRET`. Tests: `test/security.e2e-spec.ts` (5), env spec (4).
  - Web: `proxy.ts` strips visitor-sent secret and adds the real one (verified with an echo server: forged → replaced, X-Forwarded-For forwarded); security headers + CSP in `next.config.ts`, `poweredByHeader: false` (no CSP violations in dev or prod build).
  - Deps: removed unused `@nestjs/mau` (pulled vulnerable `tmp`/`undici`), `shadcn` → devDependencies; `bun audit` 20 → 1 (braces, dev-only CLI, no fix; documented exception). CI audit step + `.github/dependabot.yml`.
  - Docs: rules.md §8 rewritten (built-today table, auth/session, authz/IDOR, input/output, abuse, secrets, logging, deployment, exceptions), architecture §4.11, PRD §9.3, phases (Phase 1 + 7 security tasks), `.env.example` files.

- **2026-10-18** [api] — Supabase credentials checked (values never printed). `DATABASE_URL` (transaction pooler :6543) worked; `DIRECT_URL` (session pooler :5432) still had Supabase's password placeholder → replaced with the user's `DB_PASS` and verified. Supabase is Postgres 17.11, `public` schema empty. API boots against it and `/health` = `database: up`. Fixed `validateEnv` so empty `KEY=` values count as unset (`src/config/env.schema.ts` + `env.schema.spec.ts`, 3 tests). Migrations **not yet applied** — waiting for the user's go-ahead (rules.md §10: migrations on a non-local DB need approval).

- **2026-10-18** [repo] — "Admin can update everything from the dashboard" (user requirement) made concrete.
  - PRD §6.7 rewritten as an inventory of everything customer-facing and where it is edited; §7 adds `FaqItem`, `ContentBlock`. Only interface wording (buttons, errors) stays in `lib/i18n/`.
  - `packages/shared/src/content.ts`: `contentSchemas` for 9 sections (site.announcement / navigation / footer, home.hero / categories / lookFile / latest / promises / social) + `imageSchema`, `linkSchema`, `hrefSchema`; 10 new tests (22 total).
  - Prisma: `FaqItem`, `ContentBlock` + migration `20261018120000_content_blocks_faq` (with RLS). Seed: text-only content blocks (validated with the shared schemas), settings `seo` + store `logo`/`messenger`; `announcement` moved from settings to content. Verified on a throwaway Postgres: both migrations apply, no drift, seed idempotent.
  - Docs: rules golden rule 10, architecture §4.7 (editable content; later sections renumbered), phases (Phase 2 sizes/colours/size-chart screens; Phase 6 per-section forms + storefront switch), apps AGENTS.

- **2026-10-18** [repo] — Home page approved by the user. CSV/Excel export added to the MVP (user request): PRD §4 + new §6.9, architecture §4.7 (API-generated, streaming, `exceljs`), rules (exceljs approved, npm `xlsx` banned), phases (Phase 2 building blocks + products export; Phase 4 coupons; Phase 5 orders/items/customers/payments).
- **2026-10-18** [api] — Phase 0 database work, done offline: full Prisma schema (21 tables, PRD §7), init migration `20261018000000_init` (+ `order_number_seq` from 24101, RLS on every table), `prisma/seed.ts` (sizes, colours, placeholder zones, settings), scripts `db:seed`/`db:deploy`/`db:status`. Verified on a throwaway `prisma dev` Postgres: migration applies, no drift, seed idempotent, `/health` = up.
- **2026-10-18** [web] — `lib/api/` (typed fetch client, `ApiError`, in-memory token + single-flight refresh hook, `api.download` for exports), `QueryProvider` (TanStack Query defaults), `/api/v1` rewrite. Verified `/api/v1/health` through the web app.
- **2026-10-18** [repo] — `.github/workflows/ci.yml`: Bun install, Biome, typecheck, tests, API e2e, build, migrations on a disposable Postgres + drift check.

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

1. [api] Apply migration `20261019000000_catalog_images` to Supabase (`db:deploy`) once the user approves; check a category photo upload end to end there.
2. [api][web] Size charts: `/admin/size-charts` (templates + custom table) + screen.
3. [api][web] Products: CRUD, status, sale window, duplicate; variants from sizes × colours, quick stock edit; product images (gallery picker); products list with search (also wire the top-bar search); product editor tabs.
4. [api][web] Export building blocks + products export (install `exceljs` after asking).

## Decisions

- **2026-10-17** — Backend is a separate NestJS app (supersedes PRD §8.1/§8.3, incl. Auth.js).
- **2026-10-17** — Monorepo with Bun workspaces (`apps/web`, `apps/api`, `packages/shared`). Bun is the package manager; the apps still run on Node.
- **2026-10-17** — Biome for lint + format across the repo (double quotes, semicolons, 2 spaces). `useImportType` off in `apps/api` (Nest DI).
- **2026-10-17** — Zod v4 everywhere. Shared request schemas live in `packages/shared`, with error codes (not sentences) as messages.
- **2026-10-17** — Frontend: Next.js + **TanStack Query** for all client-side API data. Backend: NestJS + **Prisma**. Database: **Supabase** (Postgres only).
- **2026-10-17** — Web forms use React Hook Form + Zod (per the PRD).
- **2026-10-17** [web] — shadcn/ui is the component base for storefront **and** admin (user decision), with its Lucide icons. Supersedes "storefront never imports components/ui". Social links use text chips (Lucide has no brand logos).
- **2026-10-17** [web] — Dev placeholder images from Unsplash (user decision), never shipped.
- **2026-10-18** — CSV/Excel export is MVP scope (user request). Generated by the API (`GET /admin/<resource>/export?format=csv|xlsx`), `exceljs` for xlsx.
- **2026-10-18** — Media: Supabase Storage via the API (S3 keys, sharp re-encoding), not Cloudinary (user).
- **2026-10-18** — Owner TOTP two-factor: not now (user); revisit in Phase 7.
- **2026-10-18** — Security is a first-class requirement (user): rules.md §8 is the enforced checklist; API reachable only through the website in production (shared proxy secret).
- **2026-10-18** — Everything customer-facing is editable from the dashboard (user requirement). Home/site sections are `ContentBlock` rows validated by `@aaarchive/shared/content`; no drafts in the MVP; interface wording stays in code (i18n).
- **2026-10-18** [api] — Order numbers come from a Postgres sequence (not a counter table). RLS enabled on every table as Supabase Data API protection.
- **2026-10-17** — Naming: "Phase 0–7" = build phases (`phases.md`); "Release 2/3" = post-launch scope tiers (PRD §4).
- **2026-10-17** [api] — Prisma pinned to 7.x (npm `latest` was 8.0.0-rc). Generated client in `src/generated/prisma`, git-ignored.

## Blockers / open questions

- **2026-10-19** Old free-text `Category.image` / `Collection.image` columns are unused (replaced by `imageId` + `imageAlt`); dropping them is destructive → needs the user's approval (tables are empty).
- **2026-10-19** `ui.shadcn.com` is blocked by this cloud environment's network policy, so `bunx shadcn add` fails here; allow the host in the environment settings or re-add the hand-written primitives later (`design.md` §12.1).

- `SEED_OWNER_PASSWORD` is still in `apps/api/.env`; user to remove it once the password is saved elsewhere.
- Local `bunx prisma dev` became unreliable (daemons hang in starting_up / grab port 4000). Use CI's Postgres or a disposable Postgres for migration tests.

- [web] `next.config.ts` has `experimental.agentFeedback: true` (from create-next-app). It makes `next dev` add a block to `apps/web/AGENTS.md` asking agents to send feedback to the Next.js team. Agents must not send anything without the user's approval. Ask whether to turn it off.
- [web] Logo is a raster PNG cut-out; an SVG (or transparent PNG) from the designer would be sharper. No favicon/monogram yet. No real product/campaign photos yet; men's panjabi placeholder is a white-tee photo.

- API hosting (free + commercial use) not chosen.
- User to disable Supabase Data API in the dashboard (tables are already inaccessible to its roles).
