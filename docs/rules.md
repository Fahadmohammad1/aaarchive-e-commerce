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
7. **Free tiers only.** No paid service, plan upgrade or paid add-on without the user's explicit approval. **Never deploy on Vercel Hobby** (non-commercial licence).
8. **Secrets live only in `.env` files**, which are git-ignored. Never in code, docs, `memory.md`, commit messages, logs or chat output.
9. **The six docs stay current.** Every task ends with `memory.md` updated (see `AGENTS.md`).

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
| Images | `next/image` with the Cloudinary loader |
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
| Auth | `@nestjs/jwt` + Passport, **argon2** for password hashing *(install in Phase 1)* |
| Rate limiting | `@nestjs/throttler` *(Phase 1/4)* |
| Images | Cloudinary SDK, signed uploads only *(Phase 2)* |
| Email | Resend (or Brevo) free tier *(Phase 4)* |
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
| `supabase-js`, Supabase Auth, Supabase Storage, Edge Functions | NestJS + Prisma for data and auth, Cloudinary for images | Supabase is used **only as Postgres** |
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
- Seed data (sizes, colours, delivery zones, settings, first Owner account) lives in `prisma/seed.ts` and is idempotent.

---

## 5. Error handling

### 5.1 API

- Every error response has the shape `{ statusCode, message, code?, details? }` (`AllExceptionsFilter`).
- Throw Nest `HttpException`s with a stable **`code`** for anything the UI must react to: `VALIDATION_ERROR`, `OUT_OF_STOCK`, `COUPON_INVALID`, `COUPON_EXPIRED`, `PHONE_BLOCKED`, `RATE_LIMITED`, `TURNSTILE_FAILED`, `TRXID_ALREADY_USED`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`. Add new codes to this list.
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

- Supabase is used **only as a hosted PostgreSQL database.** No Supabase client SDK, Auth, Storage, Realtime or Edge Functions.
- Two connection strings, both from Supabase → *Connect*:
  - `DATABASE_URL`: the **transaction pooler** (port `6543`), used by the running API.
  - `DIRECT_URL`: the **session pooler** (port `5432` on the pooler host), used by Prisma migrations. The plain `db.<ref>.supabase.co` direct host is IPv6-only on the free tier.
- Credentials go only into `apps/api/.env` (git-ignored). Never paste them into code, docs, `memory.md` or commits. If a credential leaks, rotate the database password in Supabase immediately.
- **Disable Supabase's Data API** (Project Settings → Data API), or at minimum enable RLS with no policies on every table. Prisma creates tables in `public`, which Supabase's REST API would otherwise expose to anyone holding the project's anon key.
- The free tier has **no automatic backups**: the GitHub Actions `pg_dump` job (Phase 7) is mandatory before launch, and a restore must be tested.
- Free projects **pause after ~7 days without activity**. During development, expect a paused project, not a bug. In production, the uptime monitor hitting `/api/v1/health` (which queries the DB) keeps it active.
- Use a separate Supabase project (or a local Postgres) for development once real orders exist. Never run `migrate dev` against production.

---

## 7. Testing

| Package | Tool | Required coverage |
|---|---|---|
| `packages/shared` | `bun test` | Every exported helper and schema |
| `apps/api` | Vitest (unit `*.spec.ts`, e2e `test/*.e2e-spec.ts`) | Every business rule: price/discount/delivery calculation, coupon rules, stock decrement and restore, order status transitions, rate limits/blocklist, stock-status mapping, and an e2e check that public product responses contain no stock numbers |
| `apps/web` | none yet | Manual check at 375px and desktop. Add Playwright for the checkout flow in Phase 7 (needs approval) |

- A bug fix in business logic comes with a test that fails before the fix.
- Tests never hit the real Supabase database.

---

## 8. Security

- HTTPS everywhere. `helmet` on the API. CORS limited to `FRONTEND_ORIGIN`.
- Passwords: argon2. Access tokens live in memory on the client. Refresh tokens are httpOnly + Secure + SameSite=Lax cookies.
- Rate limits on login, checkout, coupon apply and track order (PRD §5.8, §9.3). Turnstile on checkout, login and contact.
- Uploads only via signed Cloudinary uploads: jpg/png/webp, ≤ 5 MB.
- Customer data (phones, addresses) appears only in admin endpoints. Tracking responses mask the phone.
- New env vars go into `.env.example` (with an empty or dummy value) and the Zod env schema in the same change.

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
- Schema changes that drop or rename data, and any migration against a non-local database.
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
