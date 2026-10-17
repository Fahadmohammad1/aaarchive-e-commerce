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
- **shadcn/ui is the component base for everything** (`components/ui/`, Radix, `radix-nova`), with **Lucide** icons. Storefront pieces in `components/store/` wrap shadcn and follow `design.md` §5–7 (radius 0, no shadows). The admin renders inside `.admin` (4px radius, `design.md` §8). Token names: `design.md` §12.1 (marigold = `primary`; shadcn `accent` is a hover surface).
- Placeholder images come from `images.unsplash.com` (allowed in `next.config.ts`) via `lib/content/home-fixtures.ts`. Remove both before launch.
- Data: the API is reached through the same-origin `/api/v1` rewrite via `lib/api/`. No database, Prisma or business logic here. The only route handler is `app/api/revalidate`.
- Feature modules in `lib/<module>/`: `<module>-schemas.ts`, `<module>-api.ts`, `<module>-keys.ts`, `use-*.ts`, `<module>-store.ts` (client state only). Kebab-case filenames with the module prefix, no `index.ts` barrels. Route-private UI goes in `_components/`.
- Shared request schemas, enums, `formatTaka`, phone helpers: import from `@aaarchive/shared/<topic>`. Don't re-implement them.
- **TanStack Query for every client-side read/write of API data** (key factories in `<module>-keys.ts`, hooks in `use-*.ts`, always forward `signal`). Server Components for SEO pages. Zustand only for real client state (cart, UI). React Hook Form + Zod for forms. See `docs/architecture.md` §3.3 and `docs/rules.md` §4.2.
- **Customer-facing content (copy, images, links, contact numbers, menus) comes from the API and is editable in the dashboard** (`docs/rules.md` golden rule 10). Only interface wording (button labels, errors) comes from `lib/i18n/`. `lib/content/home-fixtures.ts` is temporary until Phase 6.

## Commands (from the repo root)

```bash
bun run dev:web
bun run --filter @aaarchive/web build
bun run --filter @aaarchive/web typecheck   # next typegen && tsc --noEmit
```

Add a shadcn component: `bunx shadcn@latest add <name>` from `apps/web/`.

<!-- BEGIN:nextjs-agent-feedback -->

## Report Next.js feedback

The project owner enabled `experimental.agentFeedback`, authorizing this feedback pass. When enabled, `next dev` writes this block and restores it if removed. Commit `AGENTS.md` with your work to keep the tree clean.

During the current user request, retain anonymized facts as feedback candidates for meaningful or recurring Next.js issues:

- Crashes, hangs, OOMs, or unexpected slowness
- Incorrect behavior, output, errors, or diagnostics
- Missing, unclear, or conflicting documentation
- Unexpected CLI, codemod, Skill, or upgrade behavior and non-obvious workarounds

Continue the current user request without reporting immediately. Routine debugging is not feedback. Verify changes before retaining them as feedback candidates. Never retain code, logs, paths, URLs, secrets, personal information, or project-specific data.

Retain qualifying friction even if it is later fixed or worked around; record the final outcome during the reporting pass.

Before the final response, run one reporting pass. If candidates remain, from this file's directory run `npx --no-install next internal agent-feedback-instructions` once without piping or truncating its output. Follow its output or error guidance. If a network sandbox blocks it, retry with network access; if it still returns no output, continue normally.

<!-- END:nextjs-agent-feedback -->
