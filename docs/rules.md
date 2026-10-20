# Rules — Aaarchive

| | |
|---|---|
| **Last updated** | 17 October 2026 |
| **Applies to** | Everyone and every agent working in this repo: `apps/web`, `apps/api`, `packages/shared` |
| **Related docs** | `PRD.md` · `architecture.md` · `phases.md` · `design.md` · `memory.md` |

These rules decide *what to use, what to avoid and how to behave*. `architecture.md` explains how the pieces fit, and `design.md` how things look. A rule here outranks both (see `AGENTS.md` → "When the docs disagree"). When the user states a new rule, add it here with the date.

---

## 1. Golden rules

Breaking any of these is a bug, however good the rest of the change is.

1. **Stock numbers never leave the admin.** Public HTML, props, hydration data, JSON and attributes carry only `in_stock` / `low_stock` / `out_of_stock`. Over-quantity errors use the generic message: *"Not enough stock for this quantity. Please try a smaller amount."* (PRD §5.6).
2. **The client never decides money.** The web sends `variantId` + `quantity`. The API recomputes every price, discount, delivery charge and total from the database.
3. **Stock changes are atomic** (conditional decrement inside a transaction) and are restored on Cancelled / Returned.
4. **Money is integer taka** in the DB, API and UI, displayed only through `formatTaka()` (`৳1,250`).
5. **Phones are normalised** with `normalizeBdPhone()` before storing or comparing, and masked with `maskBdPhone()` wherever a customer sees an order.
6. **Every admin endpoint checks auth and role in the API.** Hiding a button is not security.
7. **Free tiers only.** No paid service, plan upgrade or paid add-on without the user's explicit approval. **Never deploy the live store on Vercel Hobby** (non-commercial licence). *Exception (owner, 2026-10-20):* Vercel Hobby may host the project **for testing only**: test data, no real customers or orders, `SITE_NOINDEX=1`. Real orders require moving off it first (architecture §8.1–8.2).
8. **Secrets live only in `.env` files**, which are git-ignored. Never in code, docs, `memory.md`, commit messages, logs or chat output.
9. **The six docs stay current.** Every task ends with `memory.md` updated (see `AGENTS.md`).
10. **Everything customer-facing is editable from the dashboard** (PRD §6.7). Never hard-code copy, images, links, prices, contact numbers or menu items in storefront code — they come from the API (catalog tables, `ContentBlock`, `Page`, `FaqItem`, `Setting`). Only interface wording lives in `lib/i18n/`. A new storefront section ships with its dashboard form and its schema in `@aaarchive/shared/content`.

---

## 2. Approved stack — what to use

### 2.1 Repo and tooling

| Need | Use |
|---|---|
| Package manager / workspaces / script runner | **Bun** (`bun install`, `bun add`, `bun run`). `bun.lock` is the only lockfile |
| Lint + format + import sorting | **Biome** (root `biome.json`) |
| Language | **TypeScript, strict** everywhere |
| Validation (both apps) | **Zod v4** |
| Shared code | `packages/shared` (`@aaarchive/shared/<topic>`) |
| CI | GitHub Actions |

### 2.2 Frontend — `apps/web`

| Need | Use |
|---|---|
| Framework | **Next.js 16** App Router, React 19, Server Components by default |
| Server state on the client | **TanStack Query v5**: every client-side read and write of API data |
| Server-rendered data (SEO pages) | Server Components calling `lib/<module>/<module>-api.ts` with `"use cache"` + `cacheTag` |
| Client-only state | **Zustand** (cart, UI toggles), only when the state is not server data |
| Forms | **React Hook Form** + `@hookform/resolvers/zod` + shared Zod schemas |
| Styling | **Tailwind CSS v4** with the tokens from `design.md` |
| UI components (storefront **and** admin) | **shadcn/ui** (`components/ui/`, Radix base, `radix-nova` style), themed by `globals.css`. Storefront pieces in `components/store/` are built **on** shadcn |
| Class merging | `cn()` from `@/lib/utils` (shadcn's `cn` package) |
| Icons | **Lucide** (`lucide-react`, shadcn's icon library), outline, 1.25–1.5px stroke |
| Images | `MediaImage` (`<img srcset>` over stored WebP sizes) for uploaded media; `next/image` for bundled assets |
| Charts (admin only) | **recharts 3** via shadcn `components/ui/chart.tsx` (owner approved 2026-10-20). Never in storefront code (JS budget). Recharts pulls in Redux Toolkit internally; that is not app-level Redux, which stays banned (§3) |
| Fonts | `next/font/google`, self-hosted: Alfa Slab One, JetBrains Mono, Inter, Hind Siliguri |
| HTTP | The project's fetch client in `lib/api/` |
| Bot protection | Cloudflare Turnstile widget |
| Hosting | Cloudflare Workers via OpenNext |

### 2.3 Backend — `apps/api`

| Need | Use |
|---|---|
| Framework | **NestJS 12** (Express adapter, ESM) |
| ORM | **Prisma 7** with `@prisma/adapter-pg` |
| Database | **PostgreSQL on Supabase** (free tier) — see §6 |
| Request / env validation | Zod via `ZodValidationPipe` and `src/config/env.schema.ts` |
| Config | `@nestjs/config` |
| API docs | `@nestjs/swagger` |
| Auth | `@nestjs/jwt` (HS256, own guards — no Passport), **`@node-rs/argon2`** (argon2id, prebuilt binaries; no install scripts), `cookie-parser` |
| Rate limiting | Own `ThrottleGuard` + `@Throttle()` in `common/throttle/` (2026-10-20: replaced `@nestjs/throttler`, whose CommonJS build cannot load NestJS 12 on Vercel). **Never add a CommonJS `@nestjs/*` add-on** (architecture §8.1) |
| Media | **Supabase Storage** via its S3 API (`@aws-sdk/client-s3`, storage-only access keys) + **`sharp`** for validation/resizing *(Phase 2, install after approval)* |
| Email | Resend free tier, called through its HTTP API with `fetch` (no SDK) in `modules/mail/mail.service.ts`; skipped and logged when `RESEND_API_KEY`/`MAIL_FROM` are unset *(Phase 4)* |
| Excel export | **exceljs** 4.4 (MIT), server-side streaming writer *(installed 2026-10-19)*. CSV is written by our own helper. Never use the npm `xlsx` package (stale 0.18.x with known advisories) |
| Tests | Vitest + supertest |

Install a listed-but-not-yet-installed library when its phase arrives. Anything **not** in these tables needs the user's approval first.

---

## 3. What to avoid

| Don't | Do instead | Why |
|---|---|---|
| `npm`, `yarn`, `pnpm`, or their lockfiles | `bun` | One package manager, one lockfile |
| ESLint, Prettier, oxlint, or their configs | Biome | One tool, already configured |
| Next.js route handlers or server actions for business logic | NestJS endpoints | The API is the single source of business rules. The only route handler is `app/api/revalidate` |
| `fetch` in `useEffect` / `useState` + loading flags | TanStack Query (`useQuery` / `useMutation`) | Caching, dedupe, retries, cancellation |
| Server data copied into Zustand or React context | TanStack Query cache | Two copies of server data drift apart |
| axios, SWR, Redux, Apollo | `lib/api/` fetch client + TanStack Query | Already decided |
| class-validator / class-transformer DTOs | Zod schemas + `ZodValidationPipe` | One validation library across the repo |
| `supabase-js`, Supabase Auth, Edge Functions, the `service_role` key | NestJS + Prisma for data and auth; Storage through the API with S3 keys | Supabase is used **only as Postgres** |
| `prisma db push` against Supabase | `prisma migrate dev` locally, `prisma migrate deploy` in CI/prod | Keeps migration history honest |
| `new PrismaClient()` | Inject `PrismaService` | One pooled client per process |
| Raw SQL with string concatenation | Prisma queries, or `$queryRaw` tagged templates when unavoidable | SQL injection |
| `float` / `Decimal` for money | `Int` taka | Rounding errors |
| `any`, `@ts-ignore`, non-null `!` to silence errors | Proper types, `unknown` + narrowing, `@ts-expect-error` with a reason | Type safety |
| Hard-coded colours, fonts, radii | Tokens from `design.md` / `globals.css` | Consistent theme |
| Hand-rolling a component shadcn already has (button, dialog, sheet, tabs, select…) | `bunx shadcn@latest add <name>`, then style it | One component base |
| Other icon libraries (Phosphor, Heroicons, react-icons…) | Lucide | One icon set |
| Hard-coded user-facing strings in web components | `apps/web/lib/i18n/` | Bangla UI in Release 2 |
| Heavy animation libraries on the storefront | CSS transitions / Web Animations API | JS budget < 150 KB |
| `index.ts` barrel files | Import from the concrete file | Tree-shaking, clear ownership |
| `import type` for anything Nest injects | Normal import | Nest DI needs the runtime class |
| Paid SaaS, paid tiers, gateway SDKs, SMS providers | — | Out of MVP scope / budget |
| Building exports in the browser from what the table shows | `GET /admin/<resource>/export` (architecture §4.8) | The page only holds one page of rows; the API applies filters, permissions and streaming |

---

## 4. Code rules

### 4.1 General

- TypeScript strict. Do not use `any`. Validate external data (HTTP bodies, env, API responses) with Zod at the boundary, and trust the inferred types inside.
- Small, single-purpose files. Names: kebab-case files in `apps/web` and `packages/shared`, Nest's `name.kind.ts` in `apps/api`.
- Comments explain **why**, not what. Link the PRD section when code enforces a business rule (`// PRD §5.6`).
- Code both apps need goes into `packages/shared`. Never copy-paste between apps.
- Run `bun run check:fix` before finishing. Do not hand-format against Biome.

### 4.2 Frontend (`apps/web`)

**Rendering and data**

- Server Components by default. Add `"use client"` only at the leaf that needs state, effects or browser APIs.
- **Public, SEO-relevant pages** (home, shop, category, collection, product, content) fetch on the server through `lib/<module>/<module>-api.ts`, cached with `"use cache"` + `cacheLife` + `cacheTag`. Product **stock status** is fetched uncached inside `<Suspense>`.
- **Everything client-side uses TanStack Query**: admin screens, account pages, cart validation, coupon apply, checkout submit, order tracking, search-as-you-type.
- When a server-rendered page also needs the data in a Client Component, prefetch on the server with `queryClient.prefetchQuery` and pass it down with `<HydrationBoundary>`. Do not fetch twice.
- **Storefront JS budget (2026-10-19).** Storefront client code never imports Zod at runtime: browser-side public reads (`lib/product/product-search-api.ts`) use `import type` and skip parsing (the server fetchers validate the same responses); URL helpers used by Client Components live in Zod-free files (`listing-query.ts`, not `listing-params.ts`). Storefront code never imports `lib/i18n/i18n-admin.ts`, `en-admin.ts` or `error-text.ts`. Dialogs, sheets and overlays that open on a tap (menu, search, filters, size chart, zoom, cart drawer) load with `next/dynamic({ ssr: false })` on first use. **Clarified 2026-10-19:** the `/checkout` route chunk *may* use Zod (React Hook Form + the shared `checkoutSchema`, as architecture §3.1 describes). `/track-order` is Zod-free since 2026-10-20 because every footer prefetches it (it validates with `normalizeBdPhone` / `normalizeOrderNumber`). Everything checkout shares with other storefront pages (header, cart store, cart drawer, `lib/cart`, `lib/order`, `lib/settings`, `*-store-api.ts`) stays Zod-free.

**TanStack Query**

- Every module with queries has a key factory, `lib/<module>/<module>-keys.ts` (e.g. `orderKeys.list(filters)`, `orderKeys.detail(id)`). Never write inline array keys.
- Hooks live in `lib/<module>/use-<thing>.ts`, and components call the hook, not `useQuery` directly.
- Always forward the query's `signal` to the API client so stale requests cancel.
- Mutations invalidate (or update) exactly the keys they affect in `onSuccess`.
- Global defaults live in `components/providers/query-provider.tsx`: `staleTime` 60s, no retry on 4xx, up to 2 retries on network/5xx, no mutation retries. Override per query only with a reason.
- Admin data containing stock numbers is **only** read client-side by authenticated users. It never goes through `"use cache"` or a public Server Component.

**UI**

- Build only from `design.md` tokens and components, on top of shadcn/ui. Storefront: radius 0, no shadows. Admin: inside `.admin` (4px radius).
- Customise shadcn through **variants** (cva) or `className` at the call site. Keep edits to `components/ui/*` to theming and added variants, and list added variants in `design.md` §12.1.
- Mobile-first: design at 375px, then scale up. Tap targets ≥ 44px.
- Accessibility: semantic HTML, labelled controls, visible focus (2px accent outline), keyboard-operable menus/sliders/modals, `prefers-reduced-motion` respected, decorative elements `aria-hidden`.
- **Dialogs return focus (2026-10-20):** a `Dialog` / `Sheet` / `AlertDialog` opened from state (no `*Trigger` inside it) spreads `useReturnFocus()` (`lib/a11y/use-return-focus.ts`) on its content, so closing it puts focus back on the button that opened it. Never `autoFocus` inside such a dialog: pass the element as `useReturnFocus(ref)`.
- Every image has `alt` (product name + colour by default), explicit dimensions or aspect ratio (no CLS), and `priority` only for the LCP image.
- Every public page sets a unique title, description and Open Graph image. Cart, checkout, account and admin pages are `noindex`.

### 4.3 Backend (`apps/api`)

- One domain per module in `src/modules/<name>/`. Controllers are thin (routing, guards, pipes); services hold logic and Prisma calls. Modules use each other's exported services, never each other's tables.
- Public and admin routes sit in **separate controllers**. Public responses go through a mapper that picks fields explicitly. Never return or spread a Prisma row in a public response.
- Every body, query and param is validated with `ZodValidationPipe`.
- Use explicit `select` for public queries, so new columns are never leaked by default.
- Writes that touch several tables use `prisma.$transaction`. Stock decrement: `variant.updateMany({ where: { id, stock: { gte: qty } }, data: { stock: { decrement: qty } } })`. A `count` of 0 means `OUT_OF_STOCK`, so abort the transaction.
- Side effects (email, cache revalidation) run **after** the transaction commits. Their failure is logged, never rolled back into the user's request.
- Pagination is mandatory on list endpoints (`page`, `limit` ≤ 100).
- Business rules carry a PRD reference in a comment and a unit test (§7).

### 4.4 Prisma and migrations

- `prisma/schema.prisma` is the source of truth for the data model (PRD §7). Model names are PascalCase singular, fields camelCase, enums UPPER_SNAKE matching `@aaarchive/shared`.
- Money fields are `Int`. Timestamps are `createdAt` / `updatedAt` on every table. Add indexes for every foreign key and every filter column in admin lists.
- Change the schema only through migrations: `bun run --filter @aaarchive/api db:migrate` (`migrate dev`) against a **local or dev** database. Production uses `prisma migrate deploy`.
- Never edit a migration that has been applied anywhere. Write a new one.
- Destructive migrations (drop/rename column or table) need the user's approval and a data-preserving plan.
- Catalog permissions (PRD §3): catalog **reads** are OWNER/STAFF, catalog **writes** are `@Roles("OWNER")`. Staff see read-only screens.
- Seed data (sizes, colours, delivery zones, settings, first Owner account) lives in `prisma/seed.ts` and is idempotent.

---

## 5. Error handling

### 5.1 API

- Every error response has the shape `{ statusCode, message, code?, details? }` (`AllExceptionsFilter`).
- Throw Nest `HttpException`s with a stable **`code`** for anything the UI must react to: `VALIDATION_ERROR`, `OUT_OF_STOCK`, `COUPON_INVALID`, `COUPON_EXPIRED`, `PHONE_BLOCKED`, `RATE_LIMITED`, `TURNSTILE_FAILED`, `TRXID_ALREADY_USED`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `SLUG_TAKEN`, `NAME_TAKEN`, `CATEGORY_IN_USE`, `SIZE_IN_USE`, `COLOR_IN_USE`, `MEDIA_NOT_FOUND`, `MEDIA_IN_USE`, and since Phase 4: `COUPON_NOT_STARTED`, `COUPON_MIN_ORDER` (`details.minOrder`), `COUPON_NOT_APPLICABLE`, `COUPON_LIMIT_REACHED`, `ITEM_UNAVAILABLE`, `QTY_LIMIT`, `ZONE_UNAVAILABLE`, `PAYMENT_METHOD_UNAVAILABLE`, `ORDER_NOT_FOUND`, `ZONE_IN_USE`, `COUPON_IN_USE`, `CODE_TAKEN`, and since Phase 5: `INVALID_TRANSITION`, `STATUS_CHANGED`, `ORDER_NOT_EDITABLE`, `PAYMENT_ALREADY_DECIDED`, `PHONE_ALREADY_BLOCKED`, `INVALID_TRACKING_URL`, and since Phase 6: `PRODUCT_NOT_FOUND`, `CONTACT_UNAVAILABLE`, `EMAIL_TAKEN`, `CANNOT_CHANGE_SELF`, `LAST_OWNER`, and since Phase 7: `INVALID_TOTP_CODE`, `MFA_EXPIRED`, `TOTP_ALREADY_ON`, `TOTP_SETUP_MISSING`. Add new codes to this list.
- Unexpected errors: log the full error server-side and return a bare 500 (`INTERNAL_ERROR`). Never return stack traces, SQL or Prisma messages.
- Never log passwords, tokens, full card/wallet data, or full phone numbers alongside names. Log order numbers and ids instead.
- Status codes: 400 validation, 401 not logged in, 403 wrong role, 404 not found, 409 conflict (duplicate TrxID, slug), 422 business rule (out of stock, coupon), 429 rate limit.

### 5.2 Web

- The API client converts every failure into `ApiError` (`status`, `code`, `message`, `details`; `status === 0` = network/timeout).
- UI branches on `error.code`, **never** on `message` text. Each code maps to a translated message in `lib/i18n/`, with a generic fallback.
- Form errors show inline under the field (from `details`). Other errors use a toast (`design.md` §5.17) or an inline notice with retry.
- Every route segment that fetches has `loading.tsx` / Suspense fallbacks shaped like the content (no CLS) and an `error.tsx` boundary with a retry button.
- 401 → one silent refresh, then redirect to login with `?next=`. 403 → "not allowed" screen, never a blank page.
- Never show raw API messages, stack traces or stock numbers to customers.

---

## 6. Database (Supabase) rules

- Supabase is used as **hosted PostgreSQL and Storage (media)**. No Supabase client SDK, Auth, Realtime or Edge Functions. Storage is reached only by the API, through the S3 API with storage-only access keys — never the `service_role` key.
- Two connection strings, both from Supabase → *Connect*:
  - `DATABASE_URL`: the **transaction pooler** (port `6543`), used by the running API.
  - `DIRECT_URL`: the **session pooler** (port `5432` on the pooler host), used by Prisma migrations. The plain `db.<ref>.supabase.co` direct host is IPv6-only on the free tier.
- Credentials go only into `apps/api/.env` (git-ignored). Never paste them into code, docs, `memory.md` or commits. If a credential leaks, rotate the database password in Supabase immediately.
- **Disable Supabase's Data API** (Project Settings → Data API), or at minimum enable RLS with no policies on every table. Prisma creates tables in `public`, which Supabase's REST API would otherwise expose to anyone holding the project's anon key.
- Storage bucket `media`: public read, `image/webp` only, 2 MB per object; writes only by the API.
- The free tier has **no automatic backups**: the GitHub Actions `pg_dump` job (Phase 7) is mandatory before launch, and a restore must be tested.
- Free projects **pause after ~7 days without activity**. During development, expect a paused project, not a bug. In production, the uptime monitor hitting `/api/v1/health` (which queries the DB) keeps it active.
- Use a separate Supabase project (or a local Postgres) for development once real orders exist. Never run `migrate dev` against production.

---

## 7. Testing

| Package | Tool | Required coverage |
|---|---|---|
| `packages/shared` | `bun test` | Every exported helper and schema |
| `apps/api` | Vitest (unit `*.spec.ts`, e2e `test/*.e2e-spec.ts`) | Every business rule: price/discount/delivery calculation, coupon rules, stock decrement and restore, order status transitions, rate limits/blocklist, stock-status mapping, and an e2e check that public product responses contain no stock numbers |
| `apps/web` | Playwright (`e2e/*.spec.ts`, approved 2026-10-20) | The checkout flow (COD order → track) and "no stock number in the product page". Plus a manual check at 375px and desktop |

- A bug fix in business logic comes with a test that fails before the fix.
- Tests never hit the real Supabase database.
- **Local DB e2e (2026-10-19):** run `bunx prisma dev -n <name> -p <port> -P <dbPort> --shadow-db-port <port>` in the **foreground or as a background job** (`--detach` hangs in `starting_up`), apply migrations with `DIRECT_URL=<its URL> bunx prisma migrate deploy`, then `TEST_DATABASE_URL=<its URL> bunx vitest run --config ./vitest.config.e2e.ts --no-file-parallelism` (that server is single-connection PGlite: parallel files mix up prepared statements). Add `TEST_DB_SINGLE_CONNECTION=1` there: the two race tests (last unit, simultaneous status change) need real concurrent connections and are skipped with it (2026-10-19). CI uses a real Postgres, runs them, and may run files in parallel.
- **Playwright locally (2026-10-20):** seed the test product with `bun run test/fixtures/storefront-fixture.ts` (apps/api, refuses Supabase URLs), build both apps (`API_PROXY_TARGET=http://localhost:4100/api/v1` for the web build), then `E2E_DATABASE_URL=<local URL> bun run --filter @aaarchive/web test:e2e`. `PW_CHROMIUM_PATH` points at an installed Chromium; `E2E_NO_SERVER=1` reuses servers you started.

---

## 8. Security

*Owner requirement (18 Oct 2026): the store handles real customers' names, phones, addresses and money, so it must be secure and resistant to attackers.* Every change is checked against this section. A feature is not done if it weakens any item here.

### 8.1 Built today (keep it working)

| Protection | Where |
|---|---|
| Database reachable only by the API: RLS on every table; Supabase's `anon` / `authenticated` roles have **no privileges** on any table, sequence or function (now and for future objects) | migrations `…_init`, `…_lock_down_supabase_roles` |
| API refuses requests that did not come through the website (shared secret header `x-aaarchive-proxy`, constant-time compare); visitor-forged values are stripped by `proxy.ts` | `ProxySecretMiddleware`, `apps/web/proxy.ts` |
| Global rate limit per client IP (120/min default), `trust proxy` set per deployment so the IP is the visitor's | `ThrottleGuard` (`common/throttle/`), `TRUST_PROXY` |
| Server Components call the API directly with the shared secret plus `x-aaarchive-ssr: 1`; only GET/HEAD reads carrying **both** skip the per-IP limit (they all come from the web server's one IP). `proxy.ts` strips `x-aaarchive-ssr` from visitor requests | `lib/api/api-client.ts`, `isServerRender()` in `proxy-secret.middleware.ts`, `apps/web/proxy.ts` |
| Request bodies ≤ 100 KB; Zod validation on every input; one error shape with no stack traces or SQL | `main.ts`, `ZodValidationPipe`, `AllExceptionsFilter` |
| `helmet` headers on the API; CORS limited to `FRONTEND_ORIGIN`; Swagger off in production | `main.ts` |
| Web security headers: CSP (self-only scripts/styles, no framing, no plugins), HSTS (prod), `nosniff`, `X-Frame-Options: DENY`, strict referrer, Permissions-Policy, COOP; no `X-Powered-By` | `next.config.ts` |
| Production refuses to start without `API_PROXY_SECRET`, `REVALIDATE_SECRET` and `TURNSTILE_SECRET_KEY` | `env.schema.ts` |
| Every route requires OWNER/STAFF unless `@Public()` / `@Roles(...)`; user re-read from the DB on each request (deactivation, logout-everywhere and role changes apply instantly) | `JwtAuthGuard`, `RolesGuard` |
| Login: argon2id, generic errors, constant-time-ish (dummy hash), per-account lockout (5 → 15 min) + per-IP limit (10 / 15 min), Turnstile; rotating hashed refresh tokens with theft detection; Origin check on state-changing auth calls; open-redirect-safe `?next=` | `modules/auth/`, `common/auth/`, `apps/web/lib/auth/` |
| Dependency audit fails CI on high/critical advisories; Dependabot weekly PRs | `ci.yml`, `dependabot.yml` |
| Secrets only in git-ignored `.env` files | `.gitignore` |

### 8.2 Authentication & sessions (Phase 1)

- Passwords hashed with **argon2id**; minimum 10 characters, checked against a common-password list. Never log or return a password or hash.
- Access token: short-lived JWT (≤ 15 min), in memory only. Refresh token: random, stored **hashed** in the DB, httpOnly + Secure + SameSite=Lax cookie scoped to `/api/v1/auth`, **rotated on every use**; reuse of an old refresh token revokes the whole session family (token theft detection).
- Login: rate-limited per IP **and** per account (e.g. 5 attempts / 15 min), Turnstile, generic error ("Email or password is incorrect") so accounts cannot be enumerated.
- Logout and password change revoke all refresh tokens of that user. Deactivating a staff user ends their sessions immediately.
- `/auth/refresh` and every state-changing cookie-authenticated request check the `Origin` header against the site origin (CSRF defence on top of SameSite).
- Two-factor sign-in (TOTP, `otplib`) — **built** (owner decision 2026-10-20): any dashboard user can turn it on, Owners are nudged on the dashboard. Secrets encrypted at rest with `TOTP_ENCRYPTION_KEY` (required in production), codes cannot be replayed, 10 single-use hashed backup codes, wrong codes count toward the lockout, turning it off needs password + code and ends every session.

### 8.3 Authorization

- Every `/admin/**` route has `JwtAuthGuard` + `RolesGuard` by default (opt-out is impossible without code review). Staff cannot reach settings, staff management or Owner-only exports.
- Access is checked against the **record**, not just the route: no endpoint returns another customer's order or address because an id was guessed (IDOR). Public order tracking requires phone **and** order number, and masks the phone.
- The UI hiding a button is never the protection.

### 8.4 Input, output and data

- Validate every body, query and param with Zod; reject unknown fields (`.strict()` on write schemas). Normalise phones, trim strings, cap lengths.
- Prisma only — no string-built SQL. `$queryRaw` only as a tagged template.
- React escapes output by default. **Never** use `dangerouslySetInnerHTML` except for rich text that was sanitised **on the server when saved** (allow-list HTML sanitiser, Phase 6).
- **Product descriptions, content pages and FAQ answers are Markdown-lite, never HTML** (user decisions 2026-10-19 / 2026-10-20): blank line = paragraph, `- ` = bullet, `**bold**`, `## ` = heading. Parse with `@aaarchive/shared/rich-text` and render with `components/store/rich-text.tsx` (React elements). No rich-text editor dependency and no HTML sanitiser are needed for descriptions.
- Links saved by admins go through `hrefSchema` (only `/…` or `https://…`; no `javascript:`).
- The API never fetches a URL supplied by a user (no SSRF). *Owner decision 2026-10-20: no "add image from URL" option; images come from the device or the media library only.* Images are uploaded to the API (`POST /admin/media`), which validates and re-encodes them before storing in Supabase Storage. Short-lived upload — the API only signs.
- Uploads: jpg/jpeg/png/webp only (checked by decoding with `sharp`, not by name or MIME header; the browser pre-check `isAcceptedImageFile()` takes the MIME type **or** the extension, because phones often report an empty or non-standard type such as `image/jpg` — user, 2026-10-20), ≤ 8 MB in, ≤ 40 megapixels, all metadata stripped, re-encoded to WebP; the bucket accepts only `image/webp` ≤ 2 MB; storage keys are random ids, never user file names.
- Money and stock are computed on the server; stock numbers never leave admin routes.
- Exports: CSV-injection guard; same role checks as the screen. Phone columns use the `phone` export type so CSVs keep the leading 0 (user, 2026-10-19).

### 8.5 Abuse of the shop

- Checkout: Turnstile, 3 orders/phone/hour, 10/IP/hour, COD blocklist, unique TrxID, server-side prices, quantity caps.
- Coupon apply, order tracking, login, contact form: their own stricter rate limits.
- Every money-moving or status change is written to `OrderEvent` with the user who did it.

### 8.6 Secrets

- Only in `.env` files (git-ignored) and the hosts' secret stores. Never in code, docs, `memory.md`, logs, screenshots or chat.
- Generate with `openssl rand -hex 32`. Different values per environment.
- If a secret may have leaked: rotate it immediately (DB password and S3 access keys in Supabase, `API_PROXY_SECRET`, JWT secrets, Resend key), then redeploy.

### 8.7 Logging & monitoring

- Log security events (failed logins, lockouts, 403s on admin routes, rate-limit hits, refresh-token reuse) without personal data (no full phones, no tokens).
- Sentry for errors — **API only** for now (owner, 2026-10-20), initialised only when `SENTRY_DSN` is set, no request bodies, cookies or user data sent, no tracing. Uptime monitor on `/api/v1/health` (left open by `ProxySecretMiddleware` for it); alert the owner by email.
- **CSP keeps `'unsafe-inline'` for scripts (decided 2026-10-20):** a nonce would make every page dynamic and lose the static shell. Revisit if Next ships static-friendly hashes.

### 8.8 Deployment (Phase 7)

- HTTPS only. API reachable **only** through the website in production (`API_PROXY_SECRET` set; ideally the API host also restricts inbound traffic to the web host).
- `TRUST_PROXY` set to the real number of proxies, verified by checking that rate limits see distinct visitor IPs.
- Supabase: Data API disabled, strong DB password, SSL enforced, Security Advisor clean, daily backups + tested restore (`.github/workflows/backup.yml`, encrypted; every run test-restores the dump — architecture §8.3).
- Before launch: OWASP ZAP baseline scan (free) against staging, securityheaders.com grade A, `bun audit` clean, all secrets rotated from development values.

### 8.9 Dependencies

- `bun audit --audit-level=high` must pass in CI. Prefer well-maintained libraries; check before adding (rules §10 "ask first").

### 8.10 Accepted exceptions (review monthly)

| Advisory | Package | Why it is accepted | Reviewed |
|---|---|---|---|
| GHSA-w5hq-g745-h8pq (uuid < 11.1.1, missing buffer bounds check, moderate) | `uuid@8` via `exceljs` | Only `v3`/`v5`/`v6` called **with a caller-supplied buffer** are affected; exceljs uses `v4()` without a buffer. Below CI's `high` audit level. Re-check when exceljs ships a release on uuid ≥ 11 | 2026-10-19 |
| GHSA-vfj7-8cjw-p6xm (braces ≤ 3.0.3, DoS via nested patterns) | `braces` via `shadcn` CLI → `fast-glob` | No fixed version exists; only reached by the shadcn CLI a developer runs locally with our own patterns; never shipped to the site or API | 2026-10-18 |

---

## 9. Git workflow

- One repo. `main` is always deployable. Work on short-lived branches: `feat/…`, `fix/…`, `chore/…`, `docs/…`.
- Commit messages follow Conventional Commits with a scope: `feat(api): place order transaction`, `fix(web): size selector focus`, `docs: update phases`.
- A change that spans apps (shared schema + endpoint + screen) goes in **one** commit/PR.
- CI must pass before merging: `bun install --frozen-lockfile`, `bun run check`, `bun run typecheck`, `bun run test`, `bun run build`.
- Never commit `.env`, generated code (`apps/api/src/generated/`), build output or `node_modules`.

---

## 10. Boundaries for AI agents

**Always**

- Read `memory.md`, `phases.md`, this file and the relevant PRD section before starting. Read `architecture.md` before creating files, and `design.md` before UI.
- Stay inside the current phase. If the task belongs to a later phase, say so first.
- Run `bun run check`, `bun run typecheck` and `bun run test` before reporting done, and report failures honestly with the output.
- Update `memory.md` (and `phases.md`, `architecture.md` when affected) at the end of every task.
- Point out when a request conflicts with the PRD, these rules or the design, and ask.

**Ask first**

- Installing or removing any dependency.
- Schema changes that drop or rename data, and any migration against a non-local database — **except** (user, 2026-10-19): after finishing a task that adds migrations, the agent applies them to the project's Supabase database itself with `bun run --filter @aaarchive/api db:deploy` (`prisma migrate deploy`, additive migrations only) and reports it. Destructive migrations still need approval first; `migrate dev`/`db push` never run against Supabase.
- Changing an API response shape the web already uses.
- Editing `PRD.md`, or changing a decision recorded in `architecture.md`.
- Anything that costs money, changes hosting, or touches DNS / production.

**Never**

- Expose stock numbers, trust client prices, or skip an admin auth check.
- Commit, push, or rewrite git history unless asked.
- Print, store or commit secrets (Supabase credentials, JWT secrets, API keys).
- Edit generated files (`src/generated/`, `next-env.d.ts`) or the applied migrations.
- Invent endpoints, response shapes or requirements. Check the PRD and the code, then ask.
- Silence type or lint errors with `any`, `@ts-ignore` or `biome-ignore` without a written reason.
