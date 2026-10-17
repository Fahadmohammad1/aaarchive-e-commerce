# Architecture — Aaarchive

| | |
|---|---|
| **Scope** | The whole monorepo: `apps/web` (Next.js storefront + admin), `apps/api` (NestJS REST API), `packages/shared` |
| **Last updated** | 17 October 2026 |
| **Related docs** | `PRD.md` (what to build) · `design.md` (visual system) · `rules.md` · `phases.md` · `memory.md` |

This file is the source of truth for **how** Aaarchive is built: repo layout, app flow, folder structure and stack. When code and this file disagree, fix one of them in the same change.

---

## 1. Repository

**Decision (17 Oct 2026):** one git repository (monorepo), managed with **Bun workspaces**, linted and formatted with **Biome**. Frontend and backend stay separate *apps*: they deploy separately and talk only over HTTP. Code they both need lives in `packages/shared`.

```
aaarchive/
├── AGENTS.md · CLAUDE.md          # agent guide for the whole repo (each app adds its own short one)
├── docs/                          # the six project docs — the ONLY copy
│   ├── PRD.md · architecture.md · rules.md · phases.md · design.md · memory.md
├── apps/
│   ├── web/                       # @aaarchive/web — Next.js 16 storefront + /admin (§3)
│   └── api/                       # @aaarchive/api — NestJS 12 REST API (§4)
├── packages/
│   └── shared/                    # @aaarchive/shared — Zod schemas, enums, helpers used by both (§5)
├── package.json                   # workspaces + root scripts
├── bun.lock                       # the only lockfile — never add package-lock.json / yarn.lock
├── biome.json                     # lint + format for every package
├── .gitignore · .gitattributes
```

### 1.1 Tooling

| Tool | Version | Role |
|---|---|---|
| **Bun** | 1.4.3 (`packageManager` in root `package.json`) | Package manager, workspace script runner, test runner for `packages/shared`. The apps themselves run on **Node** (Next and Nest are started by their own CLIs). |
| **Biome** | 2.5.15 | Lint + format + import sorting for TS/JS/JSON/CSS across the repo. Replaces ESLint (web) and oxlint + Prettier (api). Config: root `biome.json` |
| TypeScript | 5.x (web), 6.x (api, shared) | Each package keeps its own `tsconfig.json` |

**Biome config notes:**

- Format is 2-space indent, double quotes, semicolons, trailing commas, 80 columns.
- The `next` and `react` rule domains are on for `apps/web/**`.
- `noFloatingPromises` is on everywhere.
- **`style/useImportType` is off for `apps/api/**`**: Nest's DI reads constructor parameter types at runtime, and rewriting `import { ConfigService }` to `import type` silently breaks injection.
- Parameter decorators (`@Body()`) are enabled in the parser, and so are Tailwind v4 directives in CSS.
- Ignored: generated Prisma client, `next-env.d.ts`, `public/**/*.svg`, plus everything in `.gitignore`.

**Dependency scripts:** Bun only runs lifecycle scripts of trusted packages. Prisma's engines are on Bun's default trust list. If a new dependency needs its postinstall, add it to `trustedDependencies` in the root `package.json` (after asking).

### 1.2 Root commands

```bash
bun install            # install everything; also builds packages/shared and generates the Prisma client
bun run dev            # build shared, then run web + api + shared (watch) together
bun run dev:web        # Next.js only            (http://localhost:3000)
bun run dev:api        # NestJS only             (http://localhost:4000/api/v1, Swagger /api/docs)
bun run build          # build every package
bun run typecheck      # tsc in every package
bun run test           # tests in every package
bun run check          # Biome lint + format check (CI)
bun run check:fix      # Biome: apply safe fixes + format
bun run lint | format  # Biome lint only / format only
```

Run a script in one package with `bun run --filter @aaarchive/<name> <script>`, and add a dependency to one package with `bun add <pkg> --cwd apps/web`.

---

## 2. System overview

**Decision (17 Oct 2026): the backend is a separate NestJS app.** This supersedes PRD §8.1 ("one full-stack app … route handlers / server actions") and PRD §8.3: every endpoint listed there is implemented in `apps/api` under `/api/v1`. Prisma, PostgreSQL, auth, email, Turnstile verification, rate limiting and image-upload signing all live in the API.

```
            ┌────────────────────────────────────────────────────────────┐
 Browser ──►│  apps/web  (Next.js 16, Cloudflare via OpenNext)           │
            │  • storefront  (server-rendered, cached)                   │
            │  • /admin      (client-heavy, TanStack Query)              │
            │  • /api/v1/*   ── rewrite (same-origin proxy) ──┐          │
            │  • /api/revalidate  (cache webhook, only route) │          │
            └─────────────────────────────────────────────────┼──────────┘
                                                              ▼
            ┌────────────────────────────────────────────────────────────┐
            │  apps/api  (NestJS 12, separate deploy)                    │
            │  REST /api/v1 · Prisma · auth · business rules · stock      │
            └──────┬───────────────┬──────────────┬──────────────┬───────┘
                   ▼               ▼              ▼              ▼
              PostgreSQL       Cloudinary      Resend/Brevo   Cloudflare
              (Supabase)       (images)        (email)        Turnstile
```

### 2.1 Who owns what

| Concern | web | api |
|---|---|---|
| Rendering, SEO, metadata, sitemap, JSON-LD | ✅ | — |
| UI state (cart contents, drawers, filters in URL) | ✅ | — |
| Form validation | ✅ UX only (shared Zod schemas) | ✅ **authoritative** (same schemas) |
| Prices, discounts, delivery charge, totals | displays them | ✅ computes them — the client's numbers are never trusted |
| Stock numbers → `in_stock` / `low_stock` / `out_of_stock` | displays the status | ✅ computes it; public endpoints never return a number |
| Order placement, atomic stock decrement | calls `POST /orders` | ✅ |
| Auth (password, Google OAuth, sessions, roles) | holds the access token in memory, guards routes for UX | ✅ issues tokens, enforces roles |
| Turnstile | renders widget, sends token | ✅ verifies token |
| Image upload | uploads bytes to Cloudinary with a signature | ✅ issues the signature |
| Cache invalidation after admin edits | `revalidateTag` in `/api/revalidate` | ✅ calls the webhook |

`apps/web` has **no database access and no secrets beyond `REVALIDATE_SECRET`**. If a screen needs data the API does not return, add it to the API in the same change. Do not reconstruct it in the client.

### 2.2 API contract

- Base path `/api/v1`, JSON, REST. Swagger at `/api/docs` (non-production).
- **Shared schemas first:** a request body both apps validate (checkout, track order, coupon apply…) is defined once in `packages/shared` and imported by both. Response schemas that only the web needs live in `apps/web/lib/<module>/<module>-schemas.ts`.
- **Error shape** (every failure, built by the API's `AllExceptionsFilter`): `{ statusCode, message, code?, details? }`. The web turns it into an `ApiError`. Use `code` for anything the UI branches on (`VALIDATION_ERROR`, `OUT_OF_STOCK`, `COUPON_INVALID`…).
- **Paged lists:** `{ data: T[], meta: { page, limit, total } }`, query `page` (1-based) and `limit` (max 100).

---

## 3. apps/web — Next.js storefront + admin

### 3.1 App flow

**Storefront (public, SEO-critical)**

1. A request hits a Server Component page under `app/(store)/`.
2. The page calls a fetcher from `lib/<module>/<module>-api.ts`. Catalog fetchers use `"use cache"` + `cacheLife` + `cacheTag` (e.g. `product:<slug>`, `products`, `category:<slug>`), so pages prerender and are served from cache (`cacheComponents: true` in `next.config.ts`).
3. When an admin edits a product, category, collection or stock, the API calls `POST /api/revalidate` with `REVALIDATE_SECRET` and the affected tags. The route calls `revalidateTag`.
4. **Stock status on the product page is not cached.** The variant status block reads the API at request time inside `<Suspense>` (a dynamic hole in a static page), so it is always current (PRD §8.2).
5. Interactive parts (gallery, size/colour selector, add-to-cart, search overlay, sliders) are small Client Components. Storefront JS budget: < 150 KB gzipped.

**Cart → checkout → order**

```
Add to cart ──► cart-store (Zustand, persisted to localStorage)
     │                 │
     │   open drawer / cart page ──► POST /cart/validate ──► show notices (gone OOS, price changed)
     ▼
/checkout ──► React Hook Form + shared Zod schema ──► Turnstile token
     │
     └─► POST /orders { items: [{variantId, qty}], customer, address, zoneId, payment, coupon, turnstileToken }
              │  api recalculates everything, decrements stock atomically
              ▼
        /order/success/[number] ──► clear cart, fire GA4 `purchase` + Pixel `Purchase`
```

The cart stores only `variantId` + `quantity` (+ a display snapshot). It never sends a price.

**Order tracking:** `/track-order` → `POST /orders/track { phone, orderNumber }` → status timeline. No login. The phone is masked.

**Admin (`/admin`)**

1. `proxy.ts` (Next 16's replacement for `middleware.ts`) optimistically redirects visitors without a session-hint cookie from `/admin/*` to `/admin/login`.
2. `app/admin/(panel)/layout.tsx` wraps everything in a client `RequireAdmin` guard: it restores the session, checks the role (Owner / Staff), and blocks routes Staff may not see.
3. Screens are Client Components using TanStack Query hooks. Mutations invalidate their query keys. The API enforces permissions on every request regardless.

### 3.2 Stack

| Layer | Choice | Status |
|---|---|---|
| Framework | Next.js **16.4** App Router, React 19.3, TypeScript strict | installed |
| Caching | Cache Components (`cacheComponents: true`, `"use cache"`, `cacheTag`, `revalidateTag`) | enabled |
| Routing guard | `proxy.ts` | planned |
| Styling | Tailwind CSS v4: tokens in `app/globals.css` under `@theme`, no `tailwind.config` | installed |
| Admin UI kit | shadcn/ui → `components/ui/`, themed with our tokens | planned (Phase 0) |
| Storefront UI | custom components in `components/store/` per `design.md` | planned |
| Server data (client) | TanStack Query v5 (admin, account, search-as-you-type) | planned |
| Client state | Zustand (cart, UI) — never for server data | planned |
| Forms | React Hook Form + Zod (`@hookform/resolvers`) | planned |
| Fonts | `next/font/google`, self-hosted: Alfa Slab One, JetBrains Mono, Inter, Hind Siliguri | planned (replaces Geist) |
| Icons | Lucide (1.25px stroke) or Phosphor Light | open |
| Images | `next/image` with a Cloudinary loader | planned |
| Bot protection | Cloudflare Turnstile widget | planned |
| Analytics | GA4, Meta Pixel, Microsoft Clarity via `lib/analytics/` | planned |
| Hosting | Cloudflare Workers via OpenNext (`@opennextjs/cloudflare`). **Never Vercel Hobby** (non-commercial) | planned |

### 3.3 API client (`lib/api/`)

- `api.get/post/put/patch/delete<T>(path, opts)`: path relative to `NEXT_PUBLIC_API_URL`. Supports `query`, JSON body (FormData passes through), `signal`, `timeoutMs` (default 30s), optional Zod `schema`, Next fetch options.
- Every failure throws `ApiError` (`status`, `code`, `message`, `details`; `status === 0` for network errors/timeouts).
- Attaches `Authorization: Bearer <token>` when set, and does a single-flight refresh on 401 (§4.6). Never set the token on the server: module state is shared across users' requests.
- **Same-origin proxy:** `next.config.ts` rewrites `/api/v1/:path*` → `${API_PROXY_TARGET}/:path*`. The refresh cookie stays first-party, the storefront needs no CORS, and the API URL can change without a rebuild. Server Components call `API_PROXY_TARGET` directly.
- Planned files: `api-client.ts`, `api-error.ts`, `api-config.ts`, `session.ts`.

### 3.4 Folder structure

The folders exist now (empty ones hold a `.gitkeep`). Files marked *(planned)* are created in the phase that needs them.

```
apps/web/
├── AGENTS.md · CLAUDE.md          # web-specific agent notes (Next.js 16 warning)
├── proxy.ts                       # (planned) optimistic /admin guard
├── next.config.ts                 # cacheComponents, Tailwind turbopack loader, /api/v1 rewrite (planned)
├── .env.example
├── app/
│   ├── layout.tsx                 # root: <html>, fonts, providers, grain overlay
│   ├── globals.css                # Tailwind v4 + design tokens under @theme
│   ├── not-found.tsx · error.tsx · sitemap.ts · robots.ts   # (planned)
│   ├── (store)/                   # storefront — shares header/footer/floating contact
│   │   ├── layout.tsx             # (planned)
│   │   ├── page.tsx               # home (currently the create-next-app placeholder)
│   │   ├── _components/           # header, footer, menu overlay, home sections
│   │   ├── shop/ · search/ · cart/ · track-order/
│   │   ├── category/[slug]/ · collection/[slug]/
│   │   ├── product/[slug]/        # (+ _components: gallery, variant picker, size chart)
│   │   ├── checkout/              # (+ _components: payment cards, zone cards, summary)
│   │   ├── order/success/[number]/
│   │   ├── account/               # login · orders · orders/[number] · addresses
│   │   └── (content)/             # about · contact · faq · size-guide · policies/[slug]
│   ├── admin/
│   │   ├── login/                 # outside the guarded layout
│   │   └── (panel)/               # guarded: sidebar + top bar + RequireAdmin
│   │       ├── _components/
│   │       ├── orders/[id]/ · products/new/ · products/[id]/
│   │       ├── categories/ · collections/ · customers/[phone]/ · coupons/
│   │       ├── content/ · settings/
│   └── api/revalidate/            # the ONLY route handler: cache-tag webhook from the API
├── components/
│   ├── ui/                        # shadcn/ui primitives (admin)
│   ├── store/                     # storefront design system: Tag, ArrowButton, ProductCard, KanthaDivider, Wordmark…
│   ├── admin/                     # admin building blocks used by several screens: DataTable, StatusBadge…
│   └── providers/                 # QueryProvider, AuthProvider, AnalyticsProvider
├── lib/
│   ├── api/                       # shared transport core — NOT a module
│   ├── i18n/                      # every UI string (en.ts now, bn.ts Phase 2) + t()
│   ├── analytics/                 # GA4 / Pixel / Clarity event helpers
│   ├── utils.ts                   # (planned) cn()
│   ├── auth/ · product/ · category/ · collection/ · size-chart/ · cart/ · order/
│   └── payment/ · coupon/ · delivery-zone/ · customer/ · content/ · settings/ · upload/
└── public/{images,icons}/         # static brand assets (product photos are on Cloudinary)
```

### 3.5 Conventions

**Feature modules (`lib/<module>/`)** — one per backend domain, not per page:

| File | Contains | When |
|---|---|---|
| `<module>-schemas.ts` | web-only Zod response schemas + types (shared request schemas come from `@aaarchive/shared`) | always |
| `<module>-api.ts` | fetchers on `lib/api` (cached storefront fetchers live here too) | always |
| `<module>-keys.ts` | TanStack Query key factory | when there are client queries |
| `use-<thing>.ts` | Query/mutation hooks | when a Client Component needs it |
| `<module>-store.ts` | Zustand store | **only** for real client state |

- Filenames are kebab-case with the module prefix (`order-api.ts`). No `index.ts` barrels.
- Route-private UI goes in that route's `_components/`. UI used by two or more routes goes in `components/store/` or `components/admin/`.
- Storefront components do **not** import from `components/ui/`. The surfaces follow different design rules (`design.md` §5 vs §8).
- Default to Server Components. Put `"use client"` on the smallest leaf that needs it.

### 3.6 Route map

| URL | Rendering |
|---|---|
| `/`, `/shop`, `/category/[slug]`, `/collection/[slug]`, content pages | cached, tag-revalidated (filters/sort stream as dynamic) |
| `/product/[slug]` | cached shell + **uncached stock status** in Suspense |
| `/search`, `/cart`, `/checkout`, `/order/success/[number]`, `/track-order`, `/account/**` | dynamic; all but `/search` are `noindex` |
| `/admin/**` | client-heavy, `noindex`, guarded |
| `POST /api/revalidate` | route handler (secret-checked) |

---

## 4. apps/api — NestJS REST API

### 4.1 Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | **NestJS 12** on Express | **ESM** (`"type": "module"`): relative imports end in `.js` |
| Language | TypeScript 6, strict, `module: nodenext` | |
| ORM | **Prisma 7.10** (npm `latest` was an 8.0 RC at setup) | `prisma-client` generator → `src/generated/prisma` (git-ignored, regenerated on install/build), `@prisma/adapter-pg` |
| Database | PostgreSQL on Supabase free tier | `DATABASE_URL` = pooled (runtime), `DIRECT_URL` = direct (migrations, read by `prisma.config.ts`) |
| Validation | **Zod v4** via `ZodValidationPipe` | Same schemas as the web through `@aaarchive/shared`. `nestjs-zod` skipped: it supports Nest ≤ 11 only |
| Config | `@nestjs/config` + Zod env schema | refuses to boot on a bad env |
| API docs | `@nestjs/swagger` at `/api/docs` (non-production) | |
| Security | `helmet`, CORS limited to `FRONTEND_ORIGIN` | throttling, Turnstile and auth added in their phases |
| Tests | Vitest 4: `*.spec.ts` unit, `test/*.e2e-spec.ts` e2e with supertest | |

Planned (install when the module is built, after asking): `@nestjs/jwt` + `passport`, `argon2`, `@nestjs/throttler`, `cloudinary`, `resend`, `cookie-parser`.

### 4.2 Folder structure

```
apps/api/
├── AGENTS.md · CLAUDE.md          # api-specific agent notes
├── prisma/
│   ├── schema.prisma              # models from PRD §7 (Phase 0)
│   └── migrations/                # created by `bun run db:migrate`
├── prisma.config.ts               # Prisma CLI config (schema, migrations, DIRECT_URL)
├── .env.example
├── src/
│   ├── main.ts                    # /api/v1 prefix, helmet, CORS, error filter, Swagger
│   ├── app.module.ts              # Config, Prisma, Health, feature modules
│   ├── config/env.schema.ts       # Zod schema for process.env + validateEnv()
│   ├── common/                    # cross-cutting, no business logic
│   │   ├── filters/all-exceptions.filter.ts
│   │   ├── pipes/zod-validation.pipe.ts
│   │   └── guards/ · decorators/ · interceptors/     # (as needed)
│   ├── prisma/                    # global PrismaService
│   ├── health/                    # GET /api/v1/health
│   ├── generated/prisma/          # generated client (git-ignored)
│   └── modules/                   # one folder per domain (empty until its phase)
│       ├── auth/ · users/
│       ├── products/ · categories/ · collections/ · size-charts/
│       ├── cart/ · orders/ · payments/ · coupons/ · delivery-zones/
│       ├── customers/ · content/ · settings/ · uploads/ · reports/
│       └── revalidation/ · mail/
└── test/                          # e2e tests
```

### 4.3 Conventions

Follow the Nest CLI layout (`bunx nest g resource modules/<name>`):

| File | Contains |
|---|---|
| `<name>.module.ts` | the Nest module |
| `<name>.controller.ts` | HTTP layer only: routes, guards, pipes. No Prisma calls |
| `<name>.service.ts` | business logic + Prisma access |
| `<name>.schemas.ts` | API-only Zod schemas (shared ones come from `@aaarchive/shared`) |
| `<name>.mapper.ts` | Prisma row → response shape (public vs admin) |
| `*.spec.ts` | unit tests next to the file they test |

- Public and admin routes for one domain sit in **separate controllers** (`products.controller.ts` → `/products`, `admin-products.controller.ts` → `/admin/products`).
- Modules talk through exported services, never through each other's Prisma queries.
- Inject `PrismaService`. Never write `new PrismaClient()`. Never edit `src/generated/`.

### 4.4 Request flow

```
request → helmet/CORS → /api/v1 → Guard (auth/role) → ZodValidationPipe → Controller → Service → Prisma
        ← AllExceptionsFilter (on any throw) ← mapper ←──────────────────────────────────────────┘
```

- `@Body(new ZodValidationPipe(schema))`. A failure is a 400 with `code: "VALIDATION_ERROR"` and Zod's flattened `details`.
- Swagger cannot read Zod, so document bodies with `@ApiBody({ schema: z.toJSONSchema(schema) })`. Add a helper with the first module.

### 4.5 Domain rules enforced in the API (from the PRD)

- **Stock privacy (§5.6):** public responses carry `stockStatus` from `stockStatusFor()` (`@aaarchive/shared/stock`) with the threshold (product override → setting, default 3). The number never leaves an admin route, and a public mapper never spreads a Prisma row.
- **Over-quantity** → generic message. Quantity is capped per variant per order (default 5).
- **Order placement (§8.4)** happens in one `prisma.$transaction`. Per item: `UPDATE variant SET stock = stock - qty WHERE id = ? AND stock >= qty`, where zero rows means `OUT_OF_STOCK`. Then create Order + OrderItems (snapshot) + Payment + first OrderEvent and increment the coupon `usedCount`. Email goes out after commit.
- **Prices** are recomputed from the DB on every cart validate, coupon apply and order.
- **Stock restore** happens on Cancelled / Returned. **TrxID** is unique (DB constraint).
- **Money** is `Int` taka. Order numbers are `AAR-` + sequence.
- **Phone:** normalise with `normalizeBdPhone()` before storing or comparing, and mask with `maskBdPhone()` in tracking responses.
- **Abuse:** Turnstile on checkout/login/contact; 3 orders per phone per hour and 10 per IP per hour; blocklisted phones cannot place COD orders.

### 4.6 Endpoints (PRD §8.3, under `/api/v1`)

- **Public:** `GET /products`, `GET /products/:slug`, `GET /search`, `POST /cart/validate`, `POST /coupons/apply`, `POST /orders`, `POST /orders/track`, `GET /categories`, `GET /collections`, `GET /content/*`, `GET /feeds/facebook.xml`.
- **Admin** (auth + role on every route): CRUD `/admin/products`, `/admin/variants`, `/admin/categories`, `/admin/collections`, `/admin/coupons`, `/admin/zones`, `/admin/pages`, `/admin/blocked-phones`. Also `GET /admin/orders`, `PATCH /admin/orders/:id/status`, `POST /admin/orders/:id/notes`, `POST /admin/payments/:id/verify|reject`, `GET /admin/reports/summary`, `POST /admin/uploads/sign`.
- **Infra:** `GET /health`.

After an admin write that changes the storefront, the service calls `RevalidationService.revalidate(tags)`. That POSTs to `FRONTEND_REVALIDATE_URL` with `REVALIDATE_SECRET`. A failure is logged, not thrown.

### 4.7 Auth (proposed)

- `POST /auth/login` → `{ accessToken, user }`. The access token is short-lived and kept in memory by the web. The refresh token is an **httpOnly, Secure, SameSite=Lax cookie** scoped to `/api/v1/auth`.
- `POST /auth/refresh` reads the cookie and returns a new access token (rotating the refresh token). `POST /auth/logout` clears it.
- On a 401 the web refreshes once (single-flight) and retries. If the refresh fails, the session ends.
- A non-sensitive `path=/` session-hint cookie lets `proxy.ts` do the optimistic `/admin` redirect.
- Roles: `CUSTOMER | STAFF | OWNER` via `RolesGuard` + `@Roles()`. Passwords use argon2. Google OAuth for customers goes through the API callback.

This replaces the Auth.js / Better Auth line in PRD §8.1.

---

## 5. packages/shared

Code both apps need, written once. Compiled with `tsc` to `dist/` (ESM + `.d.ts`), so Next's bundler and Nest's `nodenext` ESM can both import it. `bun install` builds it, and `bun run dev` rebuilds it on change.

| Import | Contents |
|---|---|
| `@aaarchive/shared/money` | `formatTaka(1250)` → `৳1,250` |
| `@aaarchive/shared/phone` | `normalizeBdPhone()`, `maskBdPhone()`, `bdPhoneSchema` (error message is the code `INVALID_BD_PHONE`, which the web translates through `lib/i18n`) |
| `@aaarchive/shared/stock` | `STOCK_STATUSES`, `stockStatusSchema`, `stockStatusFor()`, default threshold (3) and max qty (5) |
| `@aaarchive/shared/order` | order status, payment status and payment method enums + schemas |

Rules:

- One file per topic, imported by subpath. **No `index.ts` barrel.**
- Only framework-free code: no React, no Nest, no Prisma. Zod is the one runtime dependency.
- Relative imports inside the package end in `.js`. Tests are `*.test.ts` and run with `bun test`.
- Shared Zod schemas put error **codes** in `message`, not English sentences. The web maps codes to text via `lib/i18n`.
- Add here: request schemas used by both sides (checkout, track order, coupon apply, cart validate) and enums that match Prisma enums.

---

## 6. Cross-cutting rules that shape the code

- **Stock privacy.** Storefront code calls only public endpoints. Admin data (with numbers) is fetched client-side by an authenticated user and never passes through `"use cache"` or a public Server Component.
- **Money:** integer taka end to end, displayed only via `formatTaka()`.
- **Phone:** one normaliser (`@aaarchive/shared/phone`) for checkout, tracking, blocklist and admin search.
- **i18n-ready:** no hard-coded user-facing strings in web components. They live in `apps/web/lib/i18n/`.
- **Accessibility and motion:** respect `prefers-reduced-motion`. Decorative elements are `aria-hidden`.
- **Analytics:** events go through `apps/web/lib/analytics/` so the GA4 and Pixel names stay paired (PRD §10).

---

## 7. Open questions

1. **API hosting** (free + commercial use): Oracle Cloud Always Free VM (Docker + Nginx) vs Render/Koyeb free tiers. Watch cold starts and Supabase connection limits.
2. **CI:** GitHub Actions running `bun install --frozen-lockfile`, `bun run check`, `typecheck`, `test`, `build`. Not set up yet.
3. **Backups:** GitHub Actions `pg_dump` → private storage target.
4. **Order-number sequence:** Postgres sequence via raw migration vs a counter table.
5. **Icon set:** Lucide vs Phosphor Light.
