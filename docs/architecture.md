# Architecture — Aaarchive

| | |
|---|---|
| **Scope** | The whole monorepo: `apps/web` (Next.js storefront + admin), `apps/api` (NestJS REST API), `packages/shared` |
| **Last updated** | 17 October 2026 |
| **Related docs** | `PRD.md` (what to build) · `design.md` (visual system) · `rules.md` (what to use/avoid) · `phases.md` (build order) · `memory.md` (progress) |

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
              PostgreSQL       Storage         Resend/Brevo   Cloudflare
              (Supabase)       (Supabase)      (email)        Turnstile
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
| Image upload | sends the file to `POST /admin/media` | ✅ validates, strips metadata, resizes to WebP, stores in Supabase Storage |
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
| UI components | **shadcn/ui** (Radix base, `radix-nova` style, `components.json`) → `components/ui/`, used by storefront **and** admin, themed in `globals.css` (`design.md` §12.1) | installed |
| Storefront UI | `components/store/` — editorial pieces built on shadcn (Tag, ArrowButton, ScrollSlider, ProductCard…) per `design.md` | in progress |
| Server data (client) | **TanStack Query v5**: every client-side read/write of API data (§3.3) | planned (Phase 0) |
| Client state | Zustand (cart, UI) — never for server data | planned |
| Forms | React Hook Form + Zod (`@hookform/resolvers`) | planned |
| Fonts | `next/font/google`, self-hosted: Alfa Slab One, JetBrains Mono, Inter, Hind Siliguri | planned (replaces Geist) |
| Icons | **Lucide** (`lucide-react`, shadcn's icon library) | installed |
| Images | `components/store/media-image.tsx`: `<img srcset>` over the stored WebP widths (works in Server Components; no optimiser). `next/image` only for bundled assets (logo) and dev placeholders | built |
| Bot protection | Cloudflare Turnstile widget | planned |
| Analytics | GA4, Meta Pixel, Microsoft Clarity via `lib/analytics/` | planned |
| Hosting | Cloudflare Workers via OpenNext (`@opennextjs/cloudflare`). **Never Vercel Hobby** (non-commercial) | planned |

### 3.3 Data fetching — Server Components + TanStack Query

Two paths, chosen by **who needs the data and whether it must be indexed**:

| Data | Path | Why |
|---|---|---|
| Public catalog: home, shop, category, collection, product details, content pages | **Server Component** → `lib/<module>/<module>-api.ts` with `"use cache"` + `cacheTag` | SEO, fast first paint, no client JS, revalidated by the API's webhook |
| Product stock status | **Server Component**, uncached, inside `<Suspense>` | always current, still server-rendered |
| Everything a Client Component reads or writes: admin screens, account, cart validation, coupon apply, checkout submit, order tracking, search-as-you-type, `/auth/me` | **TanStack Query** (`useQuery` / `useMutation` / `useInfiniteQuery`) | caching, dedupe, retries, cancellation, invalidation |
| Server-rendered data that a Client Component also needs (e.g. a filter bar that refines the list) | Prefetch on the server with `queryClient.prefetchQuery`, wrap in `<HydrationBoundary state={dehydrate(queryClient)}>`, read with the same `useQuery` | one fetch, no flash |

TanStack Query setup:

- `components/providers/query-provider.tsx` creates one `QueryClient` per browser session (per request on the server) and is mounted in the root layout. Defaults: `staleTime` 60s, no retry on 4xx `ApiError`, up to 2 retries on network/5xx, no mutation retries.
- Per module: `lib/<module>/<module>-keys.ts` (key factory, e.g. `productKeys.list(filters)`, `orderKeys.detail(id)`) and `lib/<module>/use-<thing>.ts` hooks. Components call hooks, never `useQuery` with inline keys.
- Query functions call `lib/api/` and forward `signal`. Responses are parsed with the module's Zod schema.
- Mutations invalidate exactly the keys they change (`queryClient.invalidateQueries({ queryKey: orderKeys.all })`). Catalog mutations in the admin also cause the API to revalidate storefront cache tags.
- Admin queries are the only place stock numbers appear. They run in the browser of an authenticated user and are never prefetched in a public Server Component.

### 3.4 API client (`lib/api/`)

- `api.get/post/put/patch/delete<T>(path, opts)`: path relative to `NEXT_PUBLIC_API_URL`. Supports `query`, JSON body (FormData passes through), `signal`, `timeoutMs` (default 30s), optional Zod `schema`, Next fetch options.
- Every failure throws `ApiError` (`status`, `code`, `message`, `details`; `status === 0` for network errors/timeouts).
- Attaches `Authorization: Bearer <token>` when set, and does a single-flight refresh on 401 (§4.10). Never set the token on the server: module state is shared across users' requests.
- **Same-origin proxy:** `next.config.ts` rewrites `/api/v1/:path*` → `${API_PROXY_TARGET}/:path*`. The refresh cookie stays first-party, the storefront needs no CORS, and the API URL can change without a rebuild. Server Components call `API_PROXY_TARGET` directly.
- Planned files: `api-client.ts`, `api-error.ts`, `api-config.ts`, `session.ts`.

### 3.5 Folder structure

The folders exist now (empty ones hold a `.gitkeep`). Files marked *(planned)* are created in the phase that needs them.

```
apps/web/
├── AGENTS.md · CLAUDE.md          # web-specific agent notes (Next.js 16 warning)
├── components.json                # shadcn config (radix-nova, lucide)
├── proxy.ts                       # (planned) optimistic /admin guard
├── next.config.ts                 # cacheComponents, Tailwind turbopack loader, /api/v1 rewrite (planned)
├── .env.example
├── app/
│   ├── layout.tsx                 # root: <html>, fonts, providers, grain overlay
│   ├── globals.css                # Tailwind v4 + design tokens under @theme
│   ├── not-found.tsx · error.tsx · sitemap.ts · robots.ts   # (planned)
│   ├── (store)/                   # storefront — shares header/footer/floating contact
│   │   ├── layout.tsx             # grain, announcement bar, header, footer, floating contact
│   │   ├── page.tsx               # home: six sections (design §6) on fixture data
│   │   ├── _components/           # site-header (+ Sheet menu), site-footer, announcement-bar, floating-contact,
│   │   │                          #   hero/category/featured-look/collections/why-us/social sections
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
│   │       ├── _components/       # admin-shell (sidebar 240px ↔ 64px rail, mobile Sheet), admin-nav(.ts, -list),
│   │       │                      #   admin-top-bar (user menu), require-admin, dashboard-welcome
│   │       ├── categories/ · collections/ · sizes/ · colors/   # list + dialog forms (_components/)
│   │       ├── orders/[id]/ · products/new/ · products/[id]/
│   │       ├── customers/[phone]/ · coupons/
│   │       ├── content/ · settings/
│   └── api/revalidate/            # the ONLY route handler: cache-tag webhook from the API
├── components/
│   ├── ui/                        # shadcn/ui primitives — the base for storefront and admin
│   ├── store/                     # storefront pieces on shadcn: Logo, Tag, ArrowButton, ScrollSlider, ProductCard, CategoryCard,
│   │                              #   SectionHeading, IndexMarkers, KanthaDivider, Wordmark, ColorSwatches,
│   │                              #   RichText (Markdown-lite → React elements, never HTML; also the editor preview)
│   ├── admin/                     # admin building blocks: page-header, list-state, form-field, switch-field,
│   │                              #   confirm-delete-dialog, image-picker (upload + library + alt), group-thumb,
│   │                              #   catalog-group-form-dialog (categories + collections), native-select,
│   │                              #   size-chart-grid (size-chart templates + product custom tables)
│   └── providers/                 # QueryProvider, AuthProvider, AnalyticsProvider
├── lib/
│   ├── api/                       # shared transport core — NOT a module (+ paged.ts: `{ data, meta }` schema helper)
│   ├── i18n/                      # en.ts (every UI string), i18n.ts (getMessages, format), error-text.ts (code → text); bn.ts in Release 2
│   ├── analytics/                 # GA4 / Pixel / Clarity event helpers
│   ├── utils.ts                   # cn() (shadcn)
│   ├── content/home-fixtures.ts   # TEMPORARY home-page data (Unsplash placeholders) until Phase 6 wires GET /content/home
│   ├── auth/ · product/ · category/ · collection/ · size/ · color/ · size-chart/ · cart/ · order/
│   └── payment/ · coupon/ · delivery-zone/ · customer/ · content/ · settings/ · upload/
└── public/
    ├── logo.png · logo.jpeg       # logo originals as supplied (black background)
    ├── images/logo-*.png          # transparent web cuts: wordmark (header/menu), full (footer)
    └── icons/                     # (future) monogram, doodles; product photos live in Supabase Storage
```

### 3.6 Conventions

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
- Both surfaces build on `components/ui/` (shadcn). Storefront wrappers live in `components/store/`. Admin screens render inside `.admin` (4px radius, `design.md` §8).
- Default to Server Components. Put `"use client"` on the smallest leaf that needs it.

### 3.7 Route map

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

Planned (install when the module is built, after asking): `sharp` (image processing), `@aws-sdk/client-s3` (Supabase Storage via its S3 API), `resend`.

### 4.2 Folder structure

```
apps/api/
├── AGENTS.md · CLAUDE.md          # api-specific agent notes
├── prisma/
│   ├── schema.prisma              # models from PRD §7 (Phase 0)
│   ├── migrations/                # 20261018000000_init (+ order_number_seq, RLS), …_content_blocks_faq, …_lock_down_supabase_roles,
│   │                              #   …_auth_sessions, …_media_assets, 20261019000000_catalog_images, 20261019010000_drop_legacy_catalog_image
│   └── seed.ts                    # idempotent: sizes, colours, zones, settings, text-only content blocks
├── prisma.config.ts               # Prisma CLI config (schema, migrations, DIRECT_URL)
├── .env.example
├── src/
│   ├── main.ts                    # /api/v1 prefix, helmet, CORS, error filter, Swagger
│   ├── app.module.ts              # Config, Prisma, Health, feature modules
│   ├── config/env.schema.ts       # Zod schema for process.env + validateEnv()
│   ├── common/                    # cross-cutting, no business logic
│   │   ├── filters/all-exceptions.filter.ts
│   │   ├── pipes/zod-validation.pipe.ts
│   │   ├── auth/                  # JwtAuthGuard, RolesGuard, SameOriginGuard, @Public/@Roles/@CurrentUser
│   │   ├── security/              # ProxySecretMiddleware
│   │   ├── prisma/prisma-errors.ts # isUniqueViolation / isForeignKeyViolation / isNotFound
│   │   ├── slug/unique-slug.ts    # "hoodies" → "hoodies-2"… (+ spec)
│   ├── prisma/                    # global PrismaService
│   ├── health/                    # GET /api/v1/health
│   ├── generated/prisma/          # generated client (git-ignored)
│   └── modules/                   # one folder per domain (empty until its phase)
│       ├── auth/                  # login, refresh, logout, change password, Turnstile, password policy
│       ├── users/
│       ├── categories/ · collections/ · sizes/ · colors/   # admin CRUD (Phase 2): admin-*.controller, service, mapper
│       ├── media/                 # upload pipeline, library, delete-when-unreferenced
│       ├── revalidation/          # RevalidationService (global): POST tags to the web's /api/revalidate
│       ├── products/ · size-charts/
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
request → helmet/CORS → body limit (100 KB) → ProxySecretMiddleware → /api/v1 → ThrottlerGuard → Guard (auth/role) → ZodValidationPipe → Controller → Service → Prisma
        ← AllExceptionsFilter (on any throw) ← mapper ←──────────────────────────────────────────┘
```

- `@Body(new ZodValidationPipe(schema))`. A failure is a 400 with `code: "VALIDATION_ERROR"` and Zod's flattened `details`.
- Swagger cannot read Zod, so document bodies with `@ApiBody({ schema: z.toJSONSchema(schema) })`. Add a helper with the first module.

### 4.5 Domain rules enforced in the API (from the PRD)

- **Stock privacy (§5.6):** public responses carry `stockStatus` from `stockStatusFor()` (`@aaarchive/shared/stock`) with the threshold (product override → setting, default 3). The number never leaves an admin route, and a public mapper never spreads a Prisma row.
- **Over-quantity** → generic message. Quantity is capped per variant per order (default 5).
- **Order placement (§8.4)** happens in one `prisma.$transaction`. Per item: `variant.updateMany({ where: { id, stock: { gte: qty } }, data: { stock: { decrement: qty } } })`, where `count === 0` means `OUT_OF_STOCK`. Then create Order + OrderItems (snapshot) + Payment + first OrderEvent and increment the coupon `usedCount`. Email goes out after commit.
- **Prices** are recomputed from the DB on every cart validate, coupon apply and order.
- **Stock restore** happens on Cancelled / Returned. **TrxID** is unique (DB constraint).
- **Money** is `Int` taka. Order numbers are `AAR-` + sequence.
- **Phone:** normalise with `normalizeBdPhone()` before storing or comparing, and mask with `maskBdPhone()` in tracking responses.
- **Abuse:** Turnstile on checkout/login/contact; 3 orders per phone per hour and 10 per IP per hour; blocklisted phones cannot place COD orders.

### 4.6 Endpoints (PRD §8.3, under `/api/v1`)

- **Public:** `GET /products`, `GET /products/:slug`, `GET /search`, `POST /cart/validate`, `POST /coupons/apply`, `POST /orders`, `POST /orders/track`, `GET /categories`, `GET /collections`, `GET /content/home` (all home sections, resolved), `GET /content/site` (announcement, navigation, footer), `GET /pages/:slug`, `GET /faq`, `GET /settings/public` (logo, contact links, SEO defaults — never payment numbers' admin notes or secrets), `GET /feeds/facebook.xml`.
- **Admin, built (Phase 2):** `GET|POST /admin/categories`, `GET|PATCH|DELETE /admin/categories/:id`; same for `/admin/collections`; `GET|POST /admin/sizes`, `PATCH|DELETE /admin/sizes/:id`; same for `/admin/colors`; `POST|GET /admin/media`, `DELETE /admin/media/:id`. Reads OWNER/STAFF, writes OWNER only. Lists take `q`, `page`, `limit` (≤ 100, default 100) and return `{ data, meta }`. Responses: category `{ id, name, slug, description, image: { mediaId, alt, media } | null, sortOrder, showOnHome, productCount, createdAt, updatedAt }` (collection adds `isActive`); size `{ id, name, sortOrder, variantCount }` (colour adds `hex`). Slugs are generated from the name when omitted (`hoodies`, `hoodies-2`…), kept on rename, `409 SLUG_TAKEN` when taken; deleting a category with products → `409 CATEGORY_IN_USE`, a size/colour used by variants → `409 SIZE_IN_USE` / `COLOR_IN_USE`; deleting a collection only unlinks its products. Size charts: `GET|POST /admin/size-charts`, `GET|PATCH|DELETE /admin/size-charts/:id`, body `sizeChartInputSchema` (`@aaarchive/shared/catalog`) on both POST and PATCH (always the whole chart), response `{ id, name, columns: string[], rows: string[][], productCount, updatedAt }`; cells are strings (`"40"`, `"27.5"`, `"38-40"`, `""`), first column = size label; names unique ignoring case (`409 NAME_TAKEN`); deleting a chart used by products → `409 SIZE_CHART_IN_USE`; editing a used chart revalidates `products`. These endpoints only see templates (`isTemplate = true`); a product's custom table is a `SizeChart` row with `isTemplate = false`, written through the product and deleted with it (or when the product switches away).
- **Admin products (Phase 2):** `GET /admin/products` (`adminProductListQuerySchema`: `q` over name/slug/SKU, `categoryId`, `status`, `stock=low|out`, `sort=updated|newest|name|stock_asc|stock_desc`, `page`, `limit` ≤ 50, default 20) → `{ data: [{ id, name, slug, status, isFeatured, category, basePrice, salePrice, saleActive, image, variantCount, totalStock, lowStockCount, outOfStockCount, updatedAt }], meta }`; `GET|PATCH|DELETE /admin/products/:id`, `POST /admin/products` (`productInputSchema`; PATCH `productUpdateSchema`, lists such as `images` and `collectionIds` replace whole); `POST /admin/products/:id/duplicate` (DRAFT copy, variants with stock 0, new SKUs); `POST /admin/products/:id/variants` (`variantGenerateSchema`: adds missing size × colour pairs, SKU from `skuFor()` made unique, ≤ 200 per product); `PATCH /admin/products/:id/variants` (`variantBulkUpdateSchema`, one transaction, `409 STOCK_CHANGED` when `expectedStock` no longer matches); `DELETE /admin/products/:id/variants/:variantId`. Every write returns the full admin product `{ …, sizeChart: { kind: none | template | custom }, images: [{ id, mediaId, alt, colorId, media }], variants: [{ id, sizeId, sizeName, colorId, colorName, colorHex, sku, stock, stockStatus, priceOverride, isActive, hasOrders }] }`. Rules: publishing needs ≥ 1 image (`400 PUBLISH_NEEDS_IMAGE`) and, when becoming published, ≥ 1 active variant (`400 PUBLISH_NEEDS_VARIANT`, so a new product is created as a draft); sale price < base price and end > start, also re-checked on the merged record for PATCH (`400 SALE_NOT_BELOW_BASE / SALE_PRICE_REQUIRED / SALE_END_BEFORE_START`, `details.field`); references checked (`400 CATEGORY_NOT_FOUND / COLLECTION_NOT_FOUND / MEDIA_NOT_FOUND / COLOR_NOT_FOUND / SIZE_CHART_NOT_FOUND`); products or variants with orders cannot be deleted (`409 PRODUCT_HAS_ORDERS / VARIANT_HAS_ORDERS`: archive or deactivate); `409 SLUG_TAKEN / SKU_TAKEN`. Reads OWNER/STAFF, writes OWNER. Product writes revalidate `products`, `product:<slug>` (old and new) and `home`. The list's stock sort runs one raw SQL query for the page's ids, then Prisma loads the rows.
- **Admin** (auth + role on every route): CRUD `/admin/products`, `/admin/variants`, `/admin/categories`, `/admin/collections`, `/admin/sizes`, `/admin/colors`, `/admin/size-charts`, `/admin/coupons`, `/admin/zones`, `/admin/pages`, `/admin/faq`, `/admin/social-posts`, `/admin/blocked-phones`. Content: `GET /admin/content`, `GET|PUT /admin/content/:key`. Settings: `GET|PUT /admin/settings/:key`. Also `GET /admin/orders`, `PATCH /admin/orders/:id/status`, `POST /admin/orders/:id/notes`, `POST /admin/payments/:id/verify|reject`, `GET /admin/reports/summary`, `POST /admin/uploads/sign`.
- **Infra:** `GET /health`.

After an admin write that changes the storefront, the service calls `RevalidationService.revalidate(tags)` (global `modules/revalidation/`), without awaiting it. That POSTs `{ tags }` to `FRONTEND_REVALIDATE_URL` with the `x-revalidate-secret` header (5 s timeout, ≤ 50 tags, a no-op when the URL is unset). A failure is logged, not thrown. Tag names come from `@aaarchive/shared/cache-tags` so both apps use the same strings; the web's `app/api/revalidate/route.ts` checks the secret (constant-time), validates the body and calls `revalidateTag(tag, "max")`. Categories revalidate `categories`, `category:<slug>` (old and new), `home`, `products`; collections the same with `collection…`; sizes/colours `products` when used by variants.

### 4.7 Editable content (PRD §6.7)

**Rule: every customer-facing word, image and link comes from the database, edited in the dashboard.** The only exception is interface wording (button labels, errors) in `apps/web/lib/i18n/`.

| Kind | Stored in | Edited at |
|---|---|---|
| Catalog (products, variants, categories, collections, sizes, colours, size charts) | their own tables | catalog screens |
| Zones, coupons, payments | tables / `Setting` | their screens, Settings |
| Home sections, announcement, navigation, footer | `ContentBlock` (one row per key, JSON) | Content → Home / Site |
| Pages, FAQ, social posts | `Page`, `FaqItem`, `SocialPost` | Content → Pages / FAQ / Social |
| Logo, contact links, SEO defaults, tracking IDs | `Setting` | Settings |

- **`ContentBlock`** keys and shapes are defined once in `@aaarchive/shared/content` (`contentSchemas`). `PUT /admin/content/:key` rejects unknown keys and validates `data` with that schema; the dashboard form uses the same schema through React Hook Form, so the two can never disagree. Adding a section = add a schema + a form + a storefront component.
- **Stored vs public shape:** blocks store references (product ids, category slugs). `GET /content/home` resolves them into what the storefront renders (product name, price, image, stock *status*), drops references that are no longer published, and returns `null` for sections not created yet — the storefront then leaves that section out.
- **Publishing:** a save writes the row, records `updatedById`, and revalidates the `content` tag (plus `home` / `site`), so the change is live on the next request. No drafts in the MVP.
- **Seed:** `prisma/seed.ts` creates the text-only blocks (announcement, navigation, footer, archive index, social). Blocks that need photos are created by the admin.
- **Until Phase 6** the storefront renders `apps/web/lib/content/home-fixtures.ts`; Phase 6 swaps it for `GET /content/home` and deletes the fixtures.

### 4.7a Media (Supabase Storage)

*Decision 18 Oct 2026 (owner): media lives in Supabase Storage, not Cloudinary.*

```
dashboard ──multipart POST /admin/media (file ≤ 8 MB, OWNER/STAFF, rate-limited)──► API
   sharp: decode (real JPG/PNG/WebP by content, not name) · reject > 40 MP (decompression bombs)
          auto-rotate · strip ALL metadata (EXIF/GPS) · resize to 400/800/1200/1600 (never upscale)
          · encode WebP · 16-px blur placeholder
   S3 PutObject ×4 → bucket "media" (Cache-Control: public, max-age=86400)
   MediaAsset row { storageKey, width, height, widths[], blurDataUrl, byteSize, uploadedById }
   ◄── 201 { id, url(s), width, height, blurDataUrl }
storefront: <MediaImage> → <img srcset> over {MEDIA_PUBLIC_BASE_URL}/{storageKey}/{w}.webp (no optimiser needed)
```

- **Why through the API and not a direct browser upload:** the API can prove the file is an image, strip location data from staff phone photos, and produce consistent WebP sizes once — no paid image transformation or optimisation service is needed at view time.
- **Credentials:** Supabase **S3 access keys** (Storage → S3 Connection), held only by the API. They reach Storage only — never the `service_role` key, which bypasses everything.
- **Bucket `media`:** public read (product images are public), Supabase-enforced limits: `image/webp` only, 2 MB per object. Only the API writes to it.
- **Keys:** `products/<mediaId>/<width>.webp`, `content/<mediaId>/<width>.webp`, `brand/…` — ids are random, file names are never user-controlled.
- **References:** `ProductImage.mediaId` and content blocks / settings store `{ mediaId, alt }`; the API resolves them to URLs. A `MediaAsset` with no references can be deleted (dashboard action; scheduled clean-up in Phase 7).
- **Caching and deletes:** objects are stored with `Cache-Control: public, max-age=86400`. Supabase's CDN keeps serving a cached copy after an object is deleted (verified 2026-10-18), so one day is the longest a deleted image stays reachable at its (random, unguessable) URL.
- **Egress:** Supabase's free tier caps monthly egress. In production the website serves images from its own domain (`/media/*` → Supabase, cached by Cloudflare's free CDN with a long edge TTL and a **purge on delete** from the API), so Supabase is hit roughly once per image size. Re-check limits before launch.
- **CSP / next/image:** `img-src` and `images.remotePatterns` allow only the project's Storage origin (`NEXT_PUBLIC_MEDIA_BASE_URL`).

### 4.8 Exports (CSV / Excel)

PRD §6.9. Generated by the API, downloaded by the admin.

- **Endpoint pattern:** `GET /admin/<resource>/export?format=csv|xlsx&<same filters as the list endpoint>` — e.g. `/admin/orders/export?format=xlsx&status=PENDING&from=2026-10-01`. The list and export share one Zod filter schema, so "what you see is what you export".
- **Building blocks** in `apps/api/src/common/export/`:
  - `export-columns.ts` — a typed column definition (`header`, `value(row)`, `type: text|number|money|date`, `width`) that each module declares once and both formats use.
  - `csv-writer.ts` — RFC 4180 escaping, UTF-8 BOM, CSV-injection guard (prefix `'` on cells starting with `= + - @`).
  - `xlsx-writer.ts` — `exceljs` streaming workbook writer: bold frozen header, column widths, `#,##0` money format.
  - `ExportService.stream(res, { filename, format, columns, rows })` — sets `Content-Type` / `Content-Disposition` and streams rows from an async iterator that pages through Prisma (`take` 1,000 at a time), so memory stays flat.
- **Guards:** same `RolesGuard` as the screen; hard cap 50,000 rows.
- **Web:** `components/admin/export-menu.tsx` (shadcn `DropdownMenu`: "CSV" / "Excel") calls `lib/api` with `responseType: blob` (the bearer token lives in memory, so a plain `<a href>` cannot be used) and saves the file with the server's file name. A TanStack `useMutation` drives the loading state.

### 4.9 Database — Supabase + Prisma

Supabase is used **only as hosted PostgreSQL**. The API is its only client (no `supabase-js`, Supabase Auth, Storage or Realtime).

| Env var (`apps/api/.env`) | Supabase connection | Used by |
|---|---|---|
| `DATABASE_URL` | **Transaction pooler**: `postgres://postgres.<ref>:<password>@aws-…pooler.supabase.com:6543/postgres` | the running API, via `PrismaPg` adapter (`src/prisma/prisma.service.ts`) |
| `DIRECT_URL` | **Session pooler**: same host, port `5432` | Prisma CLI (`migrate`, `studio`) via `prisma.config.ts` |

- The direct host `db.<ref>.supabase.co` is IPv6-only on the free tier. Use the session pooler for migrations unless the network has IPv6.
- **Disable the Data API** in Supabase (Project Settings → Data API), or enable RLS with no policies on every table. Prisma's tables live in `public`, which Supabase would otherwise expose over REST to the anon key.
- Migrations: `bun run --filter @aaarchive/api db:migrate` (`prisma migrate dev`) during development; `db:deploy` (`prisma migrate deploy`) for Supabase/production; `db:status` to check. Seed with `db:seed` (`prisma/seed.ts`, idempotent — never overwrites admin edits).
- The init migration adds two things Prisma cannot express: the `order_number_seq` sequence (orders become `AAR-24101`, `AAR-24102`…) and `ENABLE ROW LEVEL SECURITY` on every table (no policies), which blocks Supabase's anon/authenticated REST roles while the API, connecting as the table owner, is unaffected. **Every future migration that creates a table must add the same RLS line.**
- CI applies the migrations to a disposable Postgres and fails on any drift between `migrations/` and `schema.prisma`.
- The free tier pauses after ~7 days idle and has no automatic backups. The uptime monitor on `/api/v1/health` (which runs `SELECT 1`) keeps it awake, and a scheduled `pg_dump` covers backups (Phase 7).
- Credentials are provided by the user and live only in `apps/api/.env` (git-ignored). See `rules.md` §6.

### 4.10 Auth (built in Phase 1)

```
login form ──POST /auth/login {email,password,turnstileToken}──► API
   Turnstile → argon2id verify (dummy hash for unknown emails) → lockout bookkeeping
   ◄── 200 { accessToken (JWT HS256, 15 min), expiresIn, user }  +  Set-Cookie aar_rt (httpOnly, SameSite=Lax, Path=/api/v1/auth, 14 days)
browser: access token in memory (lib/api/session.ts), session-hint cookie aar_session=1 (path=/, no secret)
every API call: Authorization: Bearer … → JwtAuthGuard (verify JWT; re-read user: active? tokenVersion? session family live?) → RolesGuard
401 → one single-flight POST /auth/refresh (cookie) → rotate token in the same family → retry the call
```

- **Modules:** `apps/api/src/modules/auth/` (controller, `AuthService`, `TokenService`, `TurnstileService`, `password-policy.ts`) and `apps/api/src/common/auth/` (`JwtAuthGuard`, `RolesGuard`, `SameOriginGuard`, `@Public()`, `@Roles()`, `@CurrentUser()`).
- **Default deny:** both guards are global. A route is OWNER/STAFF-only unless it is `@Public()` or names other roles with `@Roles(...)`. Customer routes (Phase 6) must opt in.
- **Sessions:** `RefreshToken` rows hold only SHA-256 hashes, grouped by `familyId` (one login). Refresh rotates the token; presenting a token replaced more than 10 s ago revokes the whole family (theft detection; the 10 s grace covers two tabs refreshing together). The access token carries `sid` (family) and `tv` (`User.tokenVersion`), so logout, logout-everywhere, password change and deactivation take effect on the next request.
- **Endpoints:** `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/logout-all`, `GET /auth/me`, `POST /auth/change-password`. `SameOriginGuard` requires our `Origin` on the state-changing ones.
- **Limits:** login 10/IP/15 min + 5 failures/account → 15-min lock; refresh 30/min; change-password 5/15 min.
- **Web:** `AuthProvider` (mounted only in `app/admin/layout.tsx`) restores the session on load, refreshes 1 min before expiry, and signs out every tab via `BroadcastChannel`. `proxy.ts` sends guests to `/admin/login?next=…`; `RequireAdmin` is the client guard; `safeNextPath()` stops open redirects. Shared shapes: `@aaarchive/shared/auth`.
- **Not yet:** customer accounts and Google OAuth (Phase 6, if PRD Q6 = yes); TOTP for Owners (decision pending).

### 4.11 Security architecture

The full checklist is `rules.md` §8; this is how the pieces connect.

```
Browser ──HTTPS──► web (Next.js)                         ──► API (NestJS)                     ──► Postgres (Supabase)
  CSP, HSTS, no framing           proxy.ts: strip visitor's      ProxySecretMiddleware: no secret     RLS on every table;
  (next.config.ts headers)        x-aaarchive-proxy, add the     → 403 (except /health)               anon/authenticated
                                  real API_PROXY_SECRET          ThrottlerGuard: per-IP limits        have no privileges;
                                  rewrite /api/v1 → API          (req.ip via TRUST_PROXY)             only the API's owner
                                                                 Zod on every input, roles on         connection can read
                                                                 every /admin route                   or write
```

- **Why the shared secret:** the browser only ever talks to the website. If the API were also callable directly, an attacker could skip the website, fake `X-Forwarded-For` to dodge per-IP limits, and hammer endpoints. With the secret required in production, the only way in is through `proxy.ts`, which overwrites anything the visitor sent.
- **Client IP:** Next forwards `X-Forwarded-For`; the API trusts exactly `TRUST_PROXY` hops. Set it at deploy (web host = 1; add 1 for a CDN in front) and verify by watching the rate limiter see distinct visitors.
- **Secrets:** `API_PROXY_SECRET` (web + API, same value), `REVALIDATE_SECRET` (web + API), JWT secrets (API, Phase 1), DB URLs (API). The API refuses to start in production without the first two.

## 5. packages/shared

Code both apps need, written once. Compiled with `tsc` to `dist/` (ESM + `.d.ts`), so Next's bundler and Nest's `nodenext` ESM can both import it. `bun install` builds it, and `bun run dev` rebuilds it on change.

| Import | Contents |
|---|---|
| `@aaarchive/shared/money` | `formatTaka(1250)` → `৳1,250` |
| `@aaarchive/shared/phone` | `normalizeBdPhone()`, `maskBdPhone()`, `bdPhoneSchema` (error message is the code `INVALID_BD_PHONE`, which the web translates through `lib/i18n`) |
| `@aaarchive/shared/stock` | `STOCK_STATUSES`, `stockStatusSchema`, `stockStatusFor()`, default threshold (3) and max qty (5) |
| `@aaarchive/shared/order` | order status, payment status and payment method enums + schemas |
| `@aaarchive/shared/catalog` | `slugSchema`, `slugify()`, create + update schemas for categories, collections, sizes, colours (update schemas have **no defaults**: Zod 4 applies defaults inside `.partial()`), `catalogListQuerySchema` |
| `@aaarchive/shared/catalog` (size charts) | `sizeChartTableSchema` (columns + rows), `sizeChartInputSchema` (named template), limits |
| `@aaarchive/shared/product` | `productInputSchema` / `productUpdateSchema` (no defaults), `productSizeChartInputSchema` (none / template / custom table), `pricingIssues()`, `isSaleActive()` / `currentPrice()` (sale applies inside `[saleStart, saleEnd)`), `skuSchema`, `skuFor()`, `missingVariantPairs()`, `variantGenerateSchema`, `variantBulkUpdateSchema` (`expectedStock` guard), `adminProductListQuerySchema` |
| `@aaarchive/shared/rich-text` | Markdown-lite for descriptions: `parseRichText()` → paragraph/list blocks with bold runs, `richTextToPlain()` |
| `@aaarchive/shared/cache-tags` | `cacheTags` (storefront cache tag names), `REVALIDATE_SECRET_HEADER`, `REVALIDATE_MAX_TAGS` |
| `@aaarchive/shared/media` | media purposes, widths, upload limits, `mediaAssetSchema`, `pickRendition()` |
| `@aaarchive/shared/content` | `contentSchemas` registry for every editable section (PRD §6.7), plus `imageSchema`, `linkSchema`, `hrefSchema` (blocks `javascript:` and plain http), `PROMISE_ICONS` |

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

1. **API hosting** (free + commercial use): Oracle Cloud Always Free VM (Docker + Nginx) vs Render/Koyeb free tiers. Watch cold starts and Supabase connection limits (Phase 0).
2. **Backups:** GitHub Actions `pg_dump` → private storage target (Phase 7).
3. **Order-number sequence:** Postgres sequence via raw migration vs a counter table (Phase 0).
4. **Social brand logos:** Lucide has none, so the footer uses text chips. Decide whether to add a brand-icon source.

CI (GitHub Actions) is a Phase 0 task in `phases.md`.
