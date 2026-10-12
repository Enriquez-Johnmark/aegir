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

## 2026-10-12 · M2: Database schema, RLS and tests

Migrations were created with `npx supabase migration new` and revised only while local-only (never pushed), per the migration policy: composite FK indexes after `db advisors`, and an accurate "not found" error in the work-order trigger after a failing pgTAP test.

| Action | Path | Purpose | Related | Verification |
|---|---|---|---|---|
| CREATE | `supabase/migrations/20261012070232_create_tenancy.sql` | Default-privilege hardening, `private` schema, organizations, profiles, memberships, RLS helpers | D-009, D-016, D-022 | ✅ `db reset`, pgTAP 01 |
| CREATE | `supabase/migrations/20261012070234_create_vessels.sql` | Vessels, IMO check-digit validation, column grants, RLS | D-017 | ✅ pgTAP 02 |
| CREATE | `supabase/migrations/20261012070235_create_inspections.sql` | Inspections, checklist items, transition/freeze triggers, `create_inspection` RPC | D-006 | ✅ pgTAP 03 |
| CREATE | `supabase/migrations/20261012070237_create_work_orders.sql` | Work orders, transitions, assignee-only status changes, follow-up integrity | D-006 | ✅ pgTAP 04 |
| CREATE | `supabase/migrations/20261012070238_create_handovers.sql` | Immutable handovers, recipient acknowledgement | | ✅ pgTAP 05 |
| CREATE | `supabase/migrations/20261012070240_create_audit_log.sql` | Append-only audit log + triggers | | ✅ pgTAP 06 |
| CREATE | `supabase/tests/01_tenancy.test.sql` … `06_audit.test.sql` (6 files) | 73 pgTAP tests: RLS isolation, role limits, rules, audit | TESTING | ✅ 73/73 |
| UPDATE | `supabase/seed.sql` | Synthetic demo data (2 orgs, 8 users, fleet) + fixture contract | D-011, D-018 | ✅ `db reset`; sign-in via API |
| UPDATE | `supabase/config.toml` | Re-enable email provider (`[auth.email] enable_signup = true`); sign-ups stay disabled globally | D-015 correction | ✅ login 200; signup `signup_disabled` |
| CREATE | `src/types/database.types.ts` | Generated DB types (`npm run db:types`) | | ✅ typecheck |

## 2026-10-12 · M2: Authentication and app shell

| Action | Path | Purpose | Related | Verification |
|---|---|---|---|---|
| UPDATE | `package.json`, `package-lock.json` | Add `prettier` (types formatting), `@playwright/test`, Base UI deps from shadcn; scripts `db:types`, `test:e2e` | D-021, D-023 | ✅ `npm ci`-compatible lockfile |
| UPDATE | `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts` | Typed with generated `Database` | | ✅ typecheck |
| UPDATE | `src/lib/supabase/proxy.ts` | Optimistic redirects that carry refreshed cookies | ARCHITECTURE §6 | ✅ E2E |
| CREATE | `src/lib/auth/session.ts` | `getSessionState()` (React.cache, `connection()`, `getClaims()`) / `requireUser()` | D-019 | ✅ E2E |
| CREATE | `src/lib/auth/roles.ts`, `src/lib/auth/roles.test.ts` | Role labels + UI capability map mirroring SECURITY matrix | | ✅ unit 5/5 |
| CREATE | `src/lib/safe-redirect.ts`, `src/lib/safe-redirect.test.ts` | Open-redirect-safe `next` handling | SECURITY §1 | ✅ unit 10/10, E2E |
| CREATE | `src/features/auth/schemas.ts`, `src/features/auth/actions.ts` | Sign-in validation; sign-in/out Server Actions (local sign-out) | D-020 | ✅ E2E |
| CREATE | `src/features/auth/components/login-form.tsx` | Accessible login form (`Field`, `aria-invalid`, pending state) | | ✅ E2E |
| CREATE | `src/app/(auth)/layout.tsx`, `src/app/(auth)/login/page.tsx`, `src/app/(auth)/no-access/page.tsx` | Auth route group pages | | ✅ build, E2E |
| CREATE | `src/app/(app)/layout.tsx`, `src/app/(app)/dashboard/page.tsx` | Authenticated shell + dashboard | D-007 | ✅ build (partial prerender), E2E |
| CREATE | `src/features/dashboard/components/welcome-card.tsx` | Signed-in identity, organization, role | | ✅ E2E |
| CREATE | `src/components/layout/app-sidebar.tsx`, `src/components/layout/user-menu.tsx` | Sidebar navigation and user menu with sign-out | | ✅ E2E (desktop + mobile) |
| CREATE | `src/components/ui/{alert,avatar,badge,button,card,dropdown-menu,field,input,label,separator,sheet,sidebar,skeleton,spinner,tooltip}.tsx` | shadcn components via `shadcn@4.21.4 add` | D-012 | ✅ lint, typecheck |
| CREATE | `src/hooks/use-mobile.ts` | Added by shadcn; rewritten to `useSyncExternalStore` (lint: setState in effect) | | ✅ lint |
| UPDATE | `src/app/layout.tsx` | Wrap app in `TooltipProvider` | | ✅ build |
| UPDATE | `src/app/page.tsx` | Landing gets a real "Sign in" link (`nativeButton={false}`) | | ✅ build |
| CREATE | `playwright.config.ts`, `e2e/auth.spec.ts` | E2E config (desktop + mobile, serial locally) and auth flow tests | D-021 | ✅ 10/10 twice |

## 2026-10-12 · M2: Documentation

| Action | Path | Purpose | Verification |
|---|---|---|---|
| UPDATE | `docs/DATA_MODEL.md` | Design → implemented; migrations table; column-grant matrix | ✅ matches migrations |
| UPDATE | `docs/SECURITY.md` | Implemented controls, helper functions, test evidence | ✅ |
| UPDATE | `docs/DECISIONS.md` | D-011 accepted; D-015 correction; D-016 – D-023 | ✅ |
| UPDATE | `docs/CONVENTIONS.md` | RLS helper pattern, column grants, proxy cookies, `connection()`, local sign-out, `nativeButton` | ✅ |
| UPDATE | `docs/ARCHITECTURE.md`, `docs/TESTING.md`, `docs/ROADMAP.md`, `docs/DEPLOYMENT.md` | Status, commands, results, hosted-auth notes | ✅ |
| UPDATE | `README.md`, `AGENTS.md` | Status, local demo accounts, test commands | ✅ |
| UPDATE | `docs/CHANGELOG.md`, `docs/FILE-CHANGE-LOG.md` | M2 entries | ✅ reconciled with `git status` |
