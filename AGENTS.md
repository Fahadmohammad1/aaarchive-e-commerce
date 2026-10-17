# Agent Guide — Aaarchive

This file is the canonical guide for ALL coding agents (Claude Code, Cursor, Copilot, etc.) working in this repository. `CLAUDE.md` points here. Each app also has a short `AGENTS.md` with app-specific notes: read it too when you work in that app.

## Repository

One git repo (monorepo), **Bun** workspaces, **Biome** for lint + format.

```
aaarchive/
├── docs/              # the six project docs (below) — the only copy
├── apps/web/          # @aaarchive/web — Next.js 16 storefront + /admin     → apps/web/AGENTS.md
├── apps/api/          # @aaarchive/api — NestJS 12 REST API at /api/v1       → apps/api/AGENTS.md
└── packages/shared/   # @aaarchive/shared — Zod schemas, enums, helpers used by both apps
```

The apps deploy separately and talk only over HTTP (`/api/v1`). Neither imports the other. Code both need goes into `packages/shared`.

## The six project documents — read and maintain them

| Doc | Path | What it holds |
|---|---|---|
| **PRD** | `docs/PRD.md` | What to build, for whom, every feature and requirement |
| **Architecture** | `docs/architecture.md` | Repo layout, app flow, folder/file structure, tech stack (web, api, shared) |
| **Rules** | `docs/rules.md` | What to use, what to avoid, libraries, error handling, boundaries for AI |
| **Phases** | `docs/phases.md` | The project broken into phases, and the tasks in each |
| **Design** | `docs/design.md` | Colour, theme, fonts, typography, components, page layouts |
| **Memory** | `docs/memory.md` | What is done, what is in progress, which file is being worked on |

### At the start of every session or task

1. Read `docs/memory.md`: where the project stands and what was being worked on.
2. Read `docs/phases.md`: confirm the task belongs to the current phase. If it belongs to a later phase, say so before starting.
3. Read `docs/rules.md`.
4. Read the PRD section(s) for the feature you are touching. Do not work from memory of the PRD.
5. Read `docs/architecture.md` before creating files, folders, modules or endpoints, and `docs/design.md` before writing any UI.
6. Read the `AGENTS.md` of the app you are working in.

### While working

- Put files where `docs/architecture.md` says they go. If the right place isn't listed, decide, then **add it to the tree** in the same change.
- Build UI only from the tokens and components in `docs/design.md`. A new token or variant goes into `design.md` first.
- A feature that spans both apps (new endpoint + screen) is one change: shared schema in `packages/shared`, endpoint in `apps/api`, screen in `apps/web`.
- If the docs contradict each other or the user's request, stop and ask. Do not quietly pick one.

### When the user gives a rule or makes a decision

- A rule ("always…", "never…", "use X not Y") → `docs/rules.md`.
- An architecture or stack decision → `docs/architecture.md`.
- A visual decision → `docs/design.md`.
- A scope change → propose the PRD edit and wait for approval. **Never edit `docs/PRD.md` without the user's approval.**

### At the end of every task — update `docs/memory.md`

Before reporting a task done, update `docs/memory.md`:

- **Completed**: what was finished, with the files touched. Prefix entries with `[web]`, `[api]`, `[shared]` or `[repo]`.
- **In progress**: the task and the **file currently being worked on**.
- **Next up**: the next concrete step.
- **Decisions & blockers**: anything decided or blocked.

Also tick the task off in `docs/phases.md`, and update `docs/architecture.md` if the structure, stack or flow changed. Keep entries short and dated (`YYYY-MM-DD`), and rewrite stale "In progress" lines rather than appending forever.

### When the docs disagree

1. The user's explicit instruction in the current conversation
2. `rules.md`
3. `architecture.md` for how things are built, and `design.md` for how things look
4. `PRD.md` for what is built and why

Known override: **`architecture.md` §2 supersedes PRD §8.1/§8.3.** The backend is a separate NestJS app (`apps/api`), not Next.js route handlers, and auth is the API's own JWT + refresh cookie, not Auth.js.

## Project context (from the PRD)

**Aaarchive** is a new Bangladeshi clothing brand (hoodies, panjabi, related apparel). This repo is its online store: a mobile-first editorial storefront where customers order **without an account**, paying by **Cash on Delivery or manual bKash/Nagad** (they enter a TrxID that staff verify), plus a private `/admin` dashboard where the Owner and Staff manage products, variant stock, orders, payments, coupons, content and settings.

- **Users:** guest customer (main), optional registered customer, Admin/Owner, Staff/Order Manager.
- **Traffic:** mostly mobile, mostly from Facebook/Instagram. Customers prefer COD and rarely read email.
- **Budget:** free tools and free tiers only. Monthly running cost target ৳0.
- **MVP out of scope:** payment gateways, SMS/OTP, courier APIs, multi-currency, loyalty, native app.
- **Look:** dark warm editorial streetwear: slab-serif uppercase headings, monospace labels, marigold tag chips, square corners, film grain (`docs/design.md`).

### Non-negotiables (breaking any of these is a bug)

- **Never expose stock numbers** publicly: not in HTML, props, hydration data, JSON or attributes. Only `in_stock` / `low_stock` / `out_of_stock`. Over-quantity errors use the generic message (PRD §5.6).
- **Never trust client prices.** The web sends variant ids + quantities. The API computes every price, discount, charge and total.
- **Stock decrements are atomic** and restored on Cancelled/Returned.
- **Money is integer taka**, displayed as `৳1,250` via `formatTaka()`.
- **BD phone** `01XXXXXXXXX` (013–019), normalised via `@aaarchive/shared/phone`, masked in tracking.
- **Every admin route** checks auth + role in the API. UI guards are UX only.
- **All UI strings live in `apps/web/lib/i18n/`.** Bangla UI is coming in Release 2.
- **Mobile performance:** LCP < 2.5s, CLS < 0.1, storefront JS < 150 KB gzipped, Lighthouse mobile ≥ 85.
- **Accessibility:** WCAG 2.1 AA contrast, keyboard-operable UI, visible focus, `prefers-reduced-motion` respected.
- **Never deploy to Vercel Hobby** (non-commercial). **No paid services** without the user's explicit approval.

## Commands (run from the repo root)

```bash
bun install            # install all; builds packages/shared, generates the Prisma client
bun run dev            # web (3000) + api (4000) + shared watch
bun run dev:web | dev:api
bun run build          # every package
bun run typecheck      # every package
bun run test           # every package
bun run check          # Biome lint + format check
bun run check:fix      # Biome autofix + format
```

One package: `bun run --filter @aaarchive/<web|api|shared> <script>`. Add a dependency: `bun add <pkg> --cwd apps/<app>`.

## Tooling rules

- **Bun is the package manager.** Never run `npm install` / `yarn` / `pnpm` or commit their lockfiles. `bun.lock` is the only lockfile.
- **Biome is the only linter/formatter.** Do not add ESLint, Prettier or oxlint, or their configs. Config lives in the root `biome.json`. In `apps/api`, never convert DI imports to `import type` (the rule is off there on purpose: see architecture §1.1).
- Workspace dependencies use `"workspace:*"`.

## Boundaries for agents

- Do not install a dependency, add a paid service, or change hosting without asking.
- Do not invent endpoints or response shapes. If the API lacks something a screen needs, add it to the API (with the user's go-ahead) or record a blocker in `docs/memory.md`.
- Do not hand-edit generated files (`apps/api/src/generated/`, `next-env.d.ts`, `components/ui/*` beyond theming and added variants).
- Do not run migrations against a shared or production database.
- Do not commit or push unless asked.
- Before reporting work done, run `bun run check`, `bun run typecheck` and `bun run test`. For UI, check the screen at mobile (375px) and desktop widths.
