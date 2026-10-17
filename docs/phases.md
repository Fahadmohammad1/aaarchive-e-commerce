# Phases — Aaarchive

| | |
|---|---|
| **Last updated** | 17 October 2026 |
| **Current phase** | **Phase 2 — Admin dashboard & catalog management** (Phase 0: only API hosting left; Phase 1 done) |
| **Related docs** | `PRD.md` (requirements) · `architecture.md` · `rules.md` · `design.md` · `memory.md` (day-to-day progress) |

The build is split into **Phases 0–7**, which together deliver the MVP (PRD "Release 1"). Work after launch is grouped as **Release 2** and **Release 3** (PRD §4). "Phase" always means a build phase in this file. "Release" means a post-launch scope tier.

**How to use this file**

- Work happens in phase order. A task from a later phase needs the user's go-ahead.
- Tick a box (`[x]`) when the task is done **and** verified (check, typecheck, tests, manual check for UI). Record the details in `memory.md`.
- Tags: `[api]` NestJS, `[web]` Next.js, `[shared]` shared package, `[repo]` tooling/infra, `[docs]`.
- A phase is finished when every box is ticked **and** its exit criteria hold. Then move **Current phase** above to the next one.
- Estimates assume one developer working with an AI agent. Update them when reality disagrees.

| Phase | Name | Estimate | Status |
|---|---|---|---|
| 0 | Foundation | 1 week | done except API hosting |
| 1 | Authentication | 0.5 week | done |
| 2 | Admin dashboard & catalog management | 1.5 weeks | not started |
| 3 | Storefront catalog | 1.5 weeks | not started |
| 4 | Cart, checkout & order placement | 1.5 weeks | not started |
| 5 | Order management | 1.5 weeks | not started |
| 6 | Home, content & settings | 1 week | not started |
| 7 | Launch prep & launch | 1 week | not started |
| — | Release 2 / Release 3 (post-launch) | — | backlog |

---

## Phase 0 — Foundation

**Goal:** a working monorepo with a connected database, the full data model, design tokens, and the plumbing every later phase builds on.

**Repo and docs**
- [x] [repo] Monorepo: Bun workspaces (`apps/web`, `apps/api`, `packages/shared`), root scripts
- [x] [repo] Biome for lint + format, ESLint/oxlint/Prettier removed
- [x] [docs] The six docs written: PRD, architecture, rules, phases, design, memory, plus `AGENTS.md`
- [x] [repo] GitHub repo created and the initial commit pushed (`Fahadmohammad1/aaarchive-e-commerce`)
- [x] [repo] GitHub Actions CI (`.github/workflows/ci.yml`): `bun install --frozen-lockfile`, `check`, `typecheck`, `test`, API e2e, `build`, and migrations applied to a disposable Postgres + drift check *(first run happens on the next push)*

**Shared**
- [x] [shared] `money`, `phone`, `stock`, `order` helpers + enums, with tests

**Database and API**
- [x] [api] NestJS scaffold: `/api/v1`, helmet, CORS, Swagger, Zod env validation, `ZodValidationPipe`, `AllExceptionsFilter`, `PrismaService`, `/health`
- [x] [api] Supabase connected: `DATABASE_URL` (transaction pooler) and `DIRECT_URL` (session pooler) in `apps/api/.env`; `/health` reports `database: up` (2026-10-18)
- [x] [api] Migrations + seed applied to Supabase (`db:deploy`, `db:seed`) — 3 migrations, 23 tables (2026-10-18)
- [x] [api] Security baseline (rules.md §8.1): Supabase `anon`/`authenticated` stripped of all privileges + RLS on `_prisma_migrations` (migration `…_lock_down_supabase_roles`, verified on Supabase), proxy-secret middleware, global rate limit, body limits, `TRUST_PROXY`, production env requirements — 10 API tests
- [x] [web] `proxy.ts` (adds the API secret, strips forged ones — verified), security headers + CSP (no violations in dev or prod build)
- [x] [repo] `bun audit` in CI (high+), Dependabot; removed unused `@nestjs/mau`, moved `shadcn` to dev dependencies
- [ ] [api] Supabase Data API disabled (or RLS on every table) — `rules.md` §6 *(RLS is enabled on all 21 tables by the init migration; disabling the Data API in the dashboard is still recommended)*
- [x] [api] Prisma schema for every PRD §7 model (enums match `@aaarchive/shared`, money as `Int`, indexes, `createdAt`/`updatedAt`) + first migration (`20261018000000_init`, verified on a local Postgres: applies cleanly, no drift) *(apply to Supabase with `db:deploy` once credentials arrive)*
- [x] [api] Order-number sequence: Postgres `order_number_seq` starting at 24101, created in the init migration (`AAR-` prefix added by the orders service in Phase 4)
- [x] [api] `prisma/seed.ts`: sizes, colours, delivery zones (placeholder charges, PRD Q3), default settings (low-stock 3, max qty 5) — idempotent, verified twice *(first Owner account moves to Phase 1: it needs password hashing)*

**Web**
- [x] [web] Folder skeleton for every route in PRD §12
- [x] [web] Design tokens from `design.md` §12 in `app/globals.css` (`@theme`), fonts via `next/font` (replace Geist), film-grain overlay
- [x] [web] `lib/i18n/` with `en.ts` + `getMessages()` / `format()`
- [x] [web] `lib/api/` client (`api-client.ts`, `api-error.ts`, `api-config.ts`, `session.ts`, incl. `api.download` for exports) + `/api/v1` rewrite in `next.config.ts` (verified: `/api/v1/health` through the web app reached the API and DB)
- [x] [web] TanStack Query installed, `QueryProvider` with the global defaults from `rules.md` §4.2, mounted in the root layout
- [x] [web] shadcn/ui initialised (Radix, `radix-nova`) for storefront and admin, themed with our tokens
- [x] [web] Icon set chosen: Lucide (shadcn)

**Deploy**
- [ ] [repo] Hosting for the API chosen (free + commercial use); both apps deployed to a staging URL

**Exit criteria:** `bun install && bun run check && bun run typecheck && bun run test && bun run build` passes in CI; the API reaches Supabase and the schema is migrated and seeded; a web page renders with the real tokens and fonts and fetches `/api/v1/health` through the rewrite with TanStack Query.

---

## Phase 1 — Authentication

**Goal:** Owner and Staff can sign in to `/admin`, and every admin endpoint is protected by role. (Customer accounts are optional and come in Phase 6 if PRD open question 6 says so.)

- [x] [api] Install `@nestjs/jwt`, `@node-rs/argon2`, `cookie-parser` (`@nestjs/throttler` already in; Passport not needed — a small custom guard is simpler)
- [x] [api] Seed the first Owner account from env (`SEED_OWNER_EMAIL`, `SEED_OWNER_PASSWORD`), hashed with argon2
- [x] [api] `auth` module: `POST /auth/login`, `POST /auth/refresh` (rotating refresh token in an httpOnly cookie scoped to `/api/v1/auth`), `POST /auth/logout`, `POST /auth/logout-all`, `GET /auth/me`, `POST /auth/change-password`
- [x] [api] `User` with role `OWNER | STAFF | CUSTOMER`, argon2id hashes, lockout + `tokenVersion` fields; `RefreshToken` table (migration `20261018140000_auth_sessions`) *(staff management screens: Phase 6)*
- [x] [api] `JwtAuthGuard`, `RolesGuard` + `@Roles()`, `@CurrentUser()` decorator, applied globally to `/admin/**`
- [x] [api] Login rate limit per IP **and** per account + Turnstile; generic error message (no account enumeration)
- [x] [api] Refresh tokens stored hashed, rotated on every use, reuse → revoke the session family; logout / password change / staff deactivation revoke all sessions
- [x] [api] `Origin` check on `/auth/refresh` and cookie-authenticated writes (CSRF)
- [x] [api] Password policy (≥ 10 chars, common-password check), argon2id
- [x] [api] Security event logging (failed logins, lockouts, admin 403s, token reuse) without personal data
- [x] Decide: TOTP two-factor for Owner accounts — **not now** (user, 2026-10-18); revisit before launch (Phase 7)
- [x] [api] Tests: login, wrong password, refresh rotation, expired token, Staff blocked from Owner-only routes
- [x] [web] `/admin/login` page (shadcn form, React Hook Form + Zod, Turnstile)
- [x] [web] Session layer: in-memory access token, single-flight refresh (401s, proactive timer, initial restore), `AuthProvider` + `useAuth()`; `/admin/account` (change password, sign out everywhere)
- [x] [web] `proxy.ts` optimistic redirect using the session-hint cookie, plus a `RequireAdmin` guard in `app/admin/(panel)/layout.tsx`, with `?next=` round-trip
- [x] [web] Logout (also across tabs)

**Exit criteria:** an Owner signs in, refreshes the page and stays signed in, and signs out. Staff cannot open Owner-only routes (UI and API both refuse). Every `/admin/**` API call without a valid token returns 401.

---

## Phase 2 — Admin dashboard & catalog management

**Goal:** the admin shell exists and the team can create the full catalog: categories, collections, products, variants with stock, images and size charts (PRD §6.2, §6.3).

- [ ] [web] Admin shell: collapsible sidebar (240px), top bar with search + user menu, mobile layout (`design.md` §8)
- [ ] [web] Dashboard home placeholder (real stats arrive in Phase 5)
- [ ] [api] `categories`, `collections`: CRUD, slug generation, sort order, show-on-home flag
- [ ] [api] Colours and sizes: CRUD (`/admin/colors`, `/admin/sizes`), `size-charts`: templates + custom tables — all editable in the dashboard (PRD §6.7)
- [ ] [api] `products`: CRUD with draft/published/archived status, featured flag, SEO fields, sale price + window, low-stock override, duplicate product
- [ ] [api] Variants: generate from sizes × colours, SKU, stock, price override, active flag. Quick stock edit endpoint
- [ ] [repo] Supabase: create bucket `media` (public, `image/webp`, 2 MB) + S3 access keys → `apps/api/.env`
- [ ] [api] `media` module: `POST /admin/media` (sharp pipeline: content check, 40 MP cap, metadata strip, WebP 400/800/1200/1600 + blur), S3 upload, `MediaAsset`; `DELETE /admin/media/:id` when unreferenced — install `sharp`, `@aws-sdk/client-s3`
- [ ] [api] Product images reference media (order, main image, per-colour images)
- [ ] [web] `lib/media/media-loader.ts` for `next/image`; image picker/uploader component in the dashboard
- [ ] [api] `revalidation` service calling the web's `/api/revalidate` after catalog writes
- [ ] [web] Admin screens: categories (incl. photo, order, show on home), collections, sizes, colours, size charts, products list (search, filters, sort by stock), product editor (tabs: details, pricing, images, variants, size chart, SEO), inline variant stock table
- [ ] [web] `app/api/revalidate` route (secret-checked `revalidateTag`)
- [ ] [web] TanStack Query hooks + key factories for each module, with mutations invalidating the right keys
- [ ] [api] Export building blocks (`common/export/`: columns, CSV writer with BOM + injection guard, exceljs XLSX writer, streaming `ExportService`) + tests — install `exceljs`
- [ ] [api] `GET /admin/products/export` (variants with stock) — Owner only
- [ ] [web] `components/admin/export-menu.tsx` (CSV / Excel) on the products list
- [ ] [api] Tests: slug uniqueness, variant generation, sale-price window, Staff read-only on products

**Exit criteria:** the Owner creates a product with 2 colours × 4 sizes, uploads images, sets stock and publishes it. Staff can view but not edit products. Editing a product triggers revalidation.

---

## Phase 3 — Storefront catalog

**Goal:** customers can browse, filter, search and view products on a fast, SEO-ready storefront that never reveals stock numbers (PRD §5.1–5.6).

- [x] [web] Store layout: header (Menu / logo / Cart chip, sticky), menu overlay, footer, floating WhatsApp/Messenger buttons, announcement bar slot *(built early with the home page; cart count and announcement still fixture data)*
- [ ] [web] Storefront components in `components/store/`: Tag, ArrowButton, IndexMarker, KanthaDivider, Wordmark, ProductCard, CategoryCard, skeletons *(all done except skeletons)*
- [ ] [api] Public `GET /products` (filters: category, collection, size, colour, price, in-stock; sort; 12 per page) and `GET /products/:slug` with variants' `stockStatus` only
- [ ] [api] Public `GET /categories`, `GET /collections` (with product counts)
- [ ] [api] `GET /search` with Postgres full-text + `pg_trgm` (migration enables the extension)
- [ ] [api] e2e test: public product responses contain no `stock` field anywhere
- [ ] [web] `/shop`, `/category/[slug]`, `/collection/[slug]`: filters + sort in the URL, "Load more", empty state, cached with `cacheTag`
- [ ] [web] `/product/[slug]`: gallery (swipe/thumbnails/zoom), colour + size selectors (OOS sizes crossed out), uncached stock status in Suspense, quantity cap, size-chart modal, details accordion, delivery info, share, related products, sticky mobile add-to-cart bar
- [ ] [web] Search overlay (debounced 300ms, 6 instant results via TanStack Query) + `/search`
- [ ] [web] Per-page metadata, Open Graph, `Product` + `BreadcrumbList` JSON-LD

**Exit criteria:** a published product is browsable from shop → category → product on a phone. Stock status is correct and the page source contains no stock numbers. Mobile Lighthouse ≥ 85 on shop and product pages.

---

## Phase 4 — Cart, checkout & order placement

**Goal:** a guest places an order with COD or manual bKash/Nagad in under 2 minutes, and the API protects stock and prices (PRD §5.7–5.9, §8.4).

- [ ] [api] `delivery-zones`: CRUD (admin) + public list with charge and estimate
- [ ] [api] `coupons`: CRUD (admin), `POST /coupons/apply` (type, min order, max discount, dates, usage limits, per-phone limit, scope)
- [ ] [api] `POST /cart/validate`: re-checks items, prices and stock status, and returns notices
- [ ] [shared] Checkout, cart-validate, coupon-apply and track-order Zod schemas
- [ ] [api] `POST /orders`: Turnstile check, rate limits (3/phone/hour, 10/IP/hour), blocklist (COD only), server-side pricing, one transaction with conditional stock decrement, order/items snapshot/payment/event, coupon usage, unique TrxID, `AAR-` order number
- [ ] [api] Confirmation email via Resend after commit (if an email was given)
- [ ] [api] `POST /orders/track` with a masked phone in the response
- [ ] [api] Tests: price recomputation ignores client prices; concurrent orders cannot oversell; coupon edge cases; rate limit; blocklist; duplicate TrxID
- [ ] [web] Admin screens: delivery zones, coupons (with CSV/Excel export, Owner only)
- [ ] [web] Cart store (Zustand, persisted) + cart drawer + `/cart`, re-validated on open
- [ ] [web] `/checkout`: contact → delivery → payment sections, zone and payment radio cards, bKash/Nagad instructions with copy, Turnstile, sticky Place Order on mobile, summary panel
- [ ] [web] `/order/success/[number]` and `/track-order` (timeline)
- [ ] [web] GA4 + Pixel events: `add_to_cart`, `begin_checkout`, `purchase`

**Exit criteria:** COD, bKash and Nagad orders all complete end to end. Two simultaneous orders for the last unit produce one order and one generic out-of-stock message. Tampered prices in the request change nothing. An order can be tracked with phone + order number.

---

## Phase 5 — Order management

**Goal:** staff can confirm, process, ship and close orders, verify payments and manage risky customers from the admin, including on a phone (PRD §6.1, §6.4, §6.5).

- [ ] [api] Admin orders: list with filters (status, payment status, method, date range, zone) and search (number, phone, name), detail
- [ ] [api] Status flow per PRD §6.4, with courier name + tracking number required for Shipped and stock restored on Cancelled/Returned. Every change becomes an `OrderEvent`
- [ ] [api] Notes and call attempts ("No answer", "Confirmed", "Asked to call later")
- [ ] [api] `POST /admin/payments/:id/verify | reject` with a note
- [ ] [api] Edit order before shipping (items, quantities, address, delivery charge) with stock adjustment
- [ ] [api] `customers`: list by phone (incl. guests) with totals and success rate, plus the phone blocklist CRUD
- [ ] [api] `GET /admin/reports/summary`: today/month orders and revenue, orders by status, payments awaiting verification, low-stock top 10, best sellers
- [ ] [api] Exports: orders, order items, customers, payments (PRD §6.9), each sharing the list endpoint's filter schema
- [ ] [api] Tests: every allowed and forbidden status transition, stock restore, payment verification
- [ ] [web] Orders list (cards on mobile) and order detail with status actions, payment panel, event timeline, notes, big tap targets for call outcomes
- [ ] [web] Print-friendly invoice / packing slip and bulk actions (status change, print)
- [ ] [web] Customers list/detail and blocklist screens
- [ ] [web] Export menu on orders, customers and payments lists
- [ ] [web] Dashboard home with real stats (replaces the Phase 2 placeholder)

**Exit criteria:** a test order goes Pending → Confirmed → Processing → Shipped → Delivered, and another is cancelled with its stock restored. A bKash payment is verified. The dashboard numbers match the orders. A staff member can do all of this on a phone.

---

## Phase 6 — Home, content & settings

**Goal:** the full editorial home page and content pages, all editable from the admin, and the store settings (PRD §5.2, §5.11, §6.7, §6.8).

- [x] [shared] `@aaarchive/shared/content`: schemas for every editable section (`contentSchemas`) + tests
- [x] [api] `ContentBlock` + `FaqItem` tables (migration `20261018120000_content_blocks_faq`), seed for text-only blocks
- [ ] [api] `content`: `GET /content/home` (resolved, missing sections = null), `GET /content/site`, `GET|PUT /admin/content/:key` (validated with `contentSchemas`, records `updatedById`, revalidates), `/admin/social-posts`, `/admin/pages`, `/admin/faq`, public `GET /pages/:slug`, `GET /faq`
- [ ] [api] `settings`: store info + logo, delivery/payment toggles and numbers, advance delivery charge for COD, stock defaults, SEO defaults, tracking IDs; public `GET /settings/public`
- [ ] [api] Staff management (Owner only): invite/create, role, deactivate
- [ ] [web] Home sections H1–H6 per `design.md` §6 (hero, browse by category, featured look, exclusive collections, why us, social journey) *(UI built 2026-10-17 on fixture data in `lib/content/home-fixtures.ts`; awaiting design review, then wire to the API)*
- [ ] [web] Content pages: about, contact (form + Turnstile), FAQ, size guide, policies
- [ ] [web] Admin screens: **one form per home section** (hero, archive index, look file with a click-to-place hotspot picker, latest entries + campaign, made to be kept, social), site content (announcement, menu links, footer), social posts, pages (rich text), FAQ, settings tabs (store + logo, payments, stock, SEO, tracking), staff
- [ ] [web] Storefront reads `GET /content/home` + `GET /content/site` + public settings (logo, contact links, SEO); sections without content are left out; delete `lib/content/home-fixtures.ts` and the hard-coded header/footer/menu data
- [ ] [web] 404 and error pages per `design.md` §7.8
- [ ] [api][web] *(Only if PRD open question 6 = yes)* Customer accounts: email/password + Google, My Orders, saved addresses, linking guest orders by phone

**Exit criteria:** every home section and content page is edited from the admin and shows on the storefront after revalidation. Settings changes (e.g. delivery charge) take effect at checkout.

---

## Phase 7 — Launch prep & launch

**Goal:** production-ready, measured, backed up, and launched (PRD §9, §10, §13.1).

- [ ] [web] `sitemap.ts`, `robots.ts`, canonical URLs on filtered listings, `Organization` JSON-LD
- [ ] [web] GA4, Meta Pixel, Microsoft Clarity wired through `lib/analytics/` (IDs from settings)
- [ ] [api] Facebook catalog feed `GET /feeds/facebook.xml`
- [ ] [web] Remove Unsplash placeholders (`lib/content/home-fixtures.ts`) and the `images.unsplash.com` pattern in `next.config.ts`
- [ ] [web] Performance pass: LCP < 2.5s, CLS < 0.1, storefront JS < 150 KB gzipped, Lighthouse mobile ≥ 85 on home/category/product
- [ ] [web] Accessibility pass (WCAG 2.1 AA, keyboard, reduced motion)
- [ ] [repo] Sentry free tier on both apps, and an uptime monitor on `/api/v1/health`
- [ ] Re-decide TOTP two-factor for Owner accounts (deferred in Phase 1)
- [ ] [repo] Security review before launch (rules.md §8.8): OWASP ZAP baseline scan on staging, securityheaders.com grade A, `bun audit` clean, Supabase Security Advisor clean + Data API off + SSL enforced, `TRUST_PROXY` verified, API unreachable without the proxy secret, every secret rotated from dev values
- [ ] [web] Revisit CSP: nonce-based `script-src` (drop `'unsafe-inline'`) if it can be done without losing static caching; add Turnstile/analytics domains
- [ ] [repo] Scheduled `pg_dump` backup (GitHub Actions → private storage) and a tested restore
- [ ] [repo] Production deploy: web on Cloudflare (OpenNext), API on the chosen host, domain + HTTPS, Search Console
- [ ] [repo] Serve media from our domain (`/media/*` → Supabase Storage, cached by Cloudflare) to stay within Supabase's free egress; scheduled clean-up of unreferenced media
- [ ] [web] *(Needs approval)* Playwright test for the checkout flow
- [ ] PRD §13.1 launch checklist completed
- [ ] Soft launch to friends/followers → public launch

**Exit criteria:** every item of the PRD §13.1 launch checklist is ticked.

---

## Backlog — Release 2 (after launch)

From PRD §4: product reviews · "notify me" when back in stock · saved addresses and reorder (if accounts were skipped) · courier API (Steadfast / Pathao) · Bangla UI (`bn.ts`) · staff activity log · CSV import · abandoned-cart email · newsletter.

## Backlog — Release 3 (when growing, may be paid)

From PRD §4: recommendations · payment gateway (SSLCommerz / bKash PGW / Nagad PGW) · automated fraud scoring · SMS notifications · advanced analytics · loyalty / referrals.
