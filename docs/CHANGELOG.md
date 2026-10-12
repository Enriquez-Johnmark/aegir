# Changelog

Meaningful functional and technical changes, newest first. Format loosely follows [Keep a Changelog](https://keepachangelog.com/). File-level detail: [FILE-CHANGE-LOG.md](FILE-CHANGE-LOG.md).

## [Unreleased]

### 2026-10-12: Foundation (M0–M1)

**Added**
- Project-local Claude Code skills: `supabase`, `supabase-postgres-best-practices`, `vercel-react-best-practices`, `shadcn` (copied into `.claude/skills/`, pinned in `skills-lock.json`).
- Next.js 16.4 App Router app (`src/`, TypeScript strict, Tailwind v4, ESLint, Cache Components).
- shadcn/ui (base-nova, Base UI primitives, lucide icons).
- Supabase SSR integration: browser and server clients, Next 16 `proxy.ts` session refresh with `getClaims()`.
- Zod-validated public environment config with unit tests; Vitest setup.
- Supabase local project (`supabase/config.toml`) with public sign-up disabled and a stronger password policy; Supabase CLI pinned as a devDependency.
- Documentation set: product, architecture (incl. folder layout), conventions, data model, security model, testing, deployment, decisions (D-001 – D-015), roadmap, ledgers.

**Reason:** establish a verified, secure foundation before any schema or feature work.

**Affected areas:** tooling, configuration, auth plumbing, docs. **Breaking changes:** none (initial). **Migrations:** none yet.

**Verification:** `npm run lint` ✅ · `npm run typecheck` ✅ · `npm test` ✅ 3/3 · `npm run build` ✅ · production server smoke (`/` 200, `/missing` 404, no errors) ✅ · `npx supabase start` ✅ (Postgres 17.11).

**Known issues:** `npm audit` reports 5 high-severity advisories in the dev-only lint toolchain (`braces` via `eslint-config-next`); not fixed because the suggested fix downgrades to Next 14 tooling.
