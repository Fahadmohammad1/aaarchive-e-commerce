# Aaarchive

Online store for Aaarchive, a Bangladeshi clothing brand: a Next.js storefront and admin (`apps/web`), a NestJS API (`apps/api`), and shared code (`packages/shared`).

```bash
bun install
cp apps/api/.env.example apps/api/.env   # set DATABASE_URL / DIRECT_URL
cp apps/web/.env.example apps/web/.env.local
bun run dev                              # web :3000, api :4000
```

Start with `docs/PRD.md` and `docs/architecture.md`. Agents: read `AGENTS.md`.
