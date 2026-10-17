<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Agent Guide — apps/web (Next.js storefront + admin)

**Read the root `AGENTS.md` first.** It holds the six-doc workflow, project context, non-negotiables and repo commands. This file only adds what is specific to `apps/web`. Details: `docs/architecture.md` §3, visual rules: `docs/design.md`.

## Essentials

- Next.js 16 App Router (`app/` at this folder's root, no `src/`), React 19, TypeScript strict. Path alias `@/*` → `apps/web/`.
- **Cache Components is on** (`cacheComponents: true`). Catalog data uses `"use cache"` + `cacheLife` + `cacheTag`, and request-time data goes inside `<Suspense>`. Stock status on the product page is **never** cached.
- `proxy.ts` replaces `middleware.ts` in Next 16.
- Tailwind CSS v4: tokens in `app/globals.css` under `@theme`, no `tailwind.config`. Use tokens, never raw hex values.
- Two UI surfaces with different rules: **storefront** = custom components in `components/store/` (radius 0, no shadows, editorial: `design.md` §5–7); **admin** = shadcn/ui in `components/ui/` (`design.md` §8). Storefront code never imports `components/ui/`.
- Data: the API is reached through the same-origin `/api/v1` rewrite via `lib/api/`. No database, Prisma or business logic here. The only route handler is `app/api/revalidate`.
- Feature modules in `lib/<module>/`: `<module>-schemas.ts`, `<module>-api.ts`, `<module>-keys.ts`, `use-*.ts`, `<module>-store.ts` (client state only). Kebab-case filenames with the module prefix, no `index.ts` barrels. Route-private UI goes in `_components/`.
- Shared request schemas, enums, `formatTaka`, phone helpers: import from `@aaarchive/shared/<topic>`. Don't re-implement them.
- **TanStack Query for every client-side read/write of API data** (key factories in `<module>-keys.ts`, hooks in `use-*.ts`, always forward `signal`). Server Components for SEO pages. Zustand only for real client state (cart, UI). React Hook Form + Zod for forms. See `docs/architecture.md` §3.3 and `docs/rules.md` §4.2.
- Every user-facing string comes from `lib/i18n/`.

## Commands (from the repo root)

```bash
bun run dev:web
bun run --filter @aaarchive/web build
bun run --filter @aaarchive/web typecheck   # next typegen && tsc --noEmit
```

Add a shadcn component: `bunx shadcn@latest add <name>` from `apps/web/`.
