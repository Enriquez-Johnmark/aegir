# File Change Log

A file-level ledger of intentional operations. Git is the authoritative record of *what* changed; this explains *why*. Append new entries at the bottom. Never rewrite history; record reversals as new entries. Build output, caches, `node_modules/`, `.env.local` and `supabase/.temp/` are excluded.

Verification key: ✅ verified (check named) · ⚠️ partially verified · ⬜ not verified

---

## 2026-10-12 · M0: Repository reconnaissance and project skills

| Action | Path | Purpose | Related | Verification |
|---|---|---|---|---|
| CREATE | `.claude/skills/supabase/**` (SKILL.md, CHANGELOG.md, references/, assets/) | Project-local Supabase platform skill (copied, not symlinked) | D-014, AGENT-SKILLS | ✅ files present, no symlinks, discovered by Claude Code |
| CREATE | `.claude/skills/supabase-postgres-best-practices/**` (SKILL.md, CHANGELOG.md, references/) | Postgres/RLS best-practice skill | AGENT-SKILLS | ✅ same |
| CREATE | `.claude/skills/vercel-react-best-practices/**` (SKILL.md, AGENTS.md, README.md, rules/) | React/Next.js performance skill | AGENT-SKILLS | ✅ same |
| CREATE | `.claude/skills/shadcn/**` (SKILL.md, *.md, rules/, scripts/, assets/, agents/, evals/) | shadcn/ui skill | D-014, AGENT-SKILLS | ✅ same; script reviewed |
| CREATE | `skills-lock.json` | Skill sources and content hashes (written by the `skills` CLI) | AGENT-SKILLS | ✅ inspected |

(136 files under `.claude/skills/` in total. Global skill directories were confirmed unchanged.)

## 2026-10-12 · M1: Foundation scaffold

Scaffolded with `create-next-app@16.4.0` in a scratch directory (it refuses non-empty folders) and copied in **without** its demo assets (`public/*.svg`), its boilerplate README, or its generated `next-env.d.ts`.

| Action | Path | Purpose | Related | Verification |
|---|---|---|---|---|
| CREATE | `package.json`, `package-lock.json` | Dependencies (exact versions) and npm scripts (`typecheck`, `test`, `db:*`) | D-003, D-013 | ✅ `npm ci`, all scripts run |
| CREATE | `.npmrc`, `.nvmrc` | `save-exact`, `engine-strict`; Node 24 | D-013 | ✅ |
| CREATE | `tsconfig.json` | Strict TS + `noUncheckedIndexedAccess`, `noImplicitOverride`; `@/*` → `src/*` | CONVENTIONS §1 | ✅ `npm run typecheck` |
| CREATE | `eslint.config.mjs` | Next core-web-vitals + TypeScript lint rules (scaffold default) | | ✅ `npm run lint` |
| CREATE | `next.config.ts` | Cache Components, partial prefetching, Tailwind turbopack loader (scaffold default) | D-007 | ✅ `npm run build` |
| CREATE | `.gitignore` | Scaffold ignores + `!.env.example` + Playwright outputs | SECURITY §4 | ✅ `git check-ignore .env.local` |
| CREATE | `src/app/layout.tsx` | Root layout: Aegir metadata (title template), Geist fonts | | ✅ build + smoke (`<title>Aegir</title>`) |
| CREATE | `src/app/page.tsx` | Public landing (no dead controls) | | ✅ smoke `/` → 200 |
| CREATE | `src/app/globals.css` | Tailwind v4 + shadcn tokens; fixed self-referencing `--font-sans` → `--font-geist-sans` | D-012 | ✅ build |
| CREATE | `src/app/favicon.ico` | Scaffold favicon (placeholder) | | ⬜ to be replaced with Aegir icon |
| CREATE | `components.json`, `src/lib/utils.ts` | shadcn/ui config (base-nova, Base UI, lucide) and `cn()` | D-012 | ✅ `shadcn info` |
| CREATE | `src/lib/env.ts` | Zod-validated public env (fail fast, browser-safe vars only) | D-002 | ✅ unit tests |
| CREATE | `src/lib/env.test.ts` | Env validation unit tests (3) | TESTING | ✅ `npm test` 3/3 |
| CREATE | `vitest.config.ts` | Vitest config: `@` alias, placeholder env for unit tests | TESTING | ✅ `npm test` |
| CREATE | `src/lib/supabase/client.ts` | Browser Supabase client (publishable key) | D-002 | ✅ typecheck/build |
| CREATE | `src/lib/supabase/server.ts` | Server Supabase client (`server-only`, per request) | D-002 | ✅ typecheck/build |
| CREATE | `src/lib/supabase/proxy.ts` | `updateSession()`: cookie refresh via `getClaims()` | D-002 | ✅ smoke: no proxy errors |
| CREATE | `src/proxy.ts` | Next 16 proxy entry (session refresh only, not authz) | ARCHITECTURE §6 | ✅ build lists "Proxy" |
| CREATE | `.env.example` | Placeholder env vars, no secrets | SECURITY §4 | ✅ reviewed |
| CREATE | `supabase/config.toml` | Local stack config; sign-up disabled, password policy hardened | D-015 | ✅ `supabase start` |
| CREATE | `supabase/.gitignore` | CLI default ignores (`.temp`, `.branches`, env files) | | ✅ |
| CREATE | `supabase/seed.sql` | Seed placeholder (header only; data in M2) | DATA_MODEL | ✅ applied during `supabase start` |

## 2026-10-12 · M1: Documentation

| Action | Path | Purpose | Related | Verification |
|---|---|---|---|---|
| CREATE | `README.md` | Project overview, setup, workflows, doc index, limitations | | ✅ reviewed |
| CREATE | `AGENTS.md` | Agent working rules + managed Next.js agent block | | ✅ reviewed |
| CREATE | `CLAUDE.md` | Imports `AGENTS.md` so Claude Code loads the same rules | | ✅ |
| CREATE | `docs/PRODUCT.md` | Users, goals, workflows, scope, exclusions | | ✅ |
| CREATE | `docs/ARCHITECTURE.md` | System design, folder layout, boundaries, data flow, caching | D-001, D-007 | ✅ |
| CREATE | `docs/CONVENTIONS.md` | Next.js, Supabase, Postgres, RLS, UI best practices | | ✅ |
| CREATE | `docs/DATA_MODEL.md` | Target schema (design; not yet migrated) | D-004–D-006 | ⚠️ design only |
| CREATE | `docs/SECURITY.md` | Auth, role matrix, RLS design, secrets, test plan | D-009, D-010 | ⚠️ design only |
| CREATE | `docs/TESTING.md` | Strategy, commands, results log | | ✅ results recorded |
| CREATE | `docs/DEPLOYMENT.md` | Planned deployment and recovery procedure | | ⬜ not executed |
| CREATE | `docs/DECISIONS.md` | ADRs D-001 – D-015 | | ✅ |
| CREATE | `docs/ROADMAP.md` | Milestones, acceptance criteria, deadline risk | | ✅ |
| CREATE | `docs/CHANGELOG.md` | Change history | | ✅ |
| CREATE | `docs/FILE-CHANGE-LOG.md` | This ledger | | ✅ reconciled with `git status` |
| CREATE | `docs/AGENT-SKILLS.md` | Skill sources, commits, verification, conflicts | | ✅ |
