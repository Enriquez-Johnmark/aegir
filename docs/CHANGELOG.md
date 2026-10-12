# Changelog

Meaningful functional and technical changes, newest first. Format loosely follows [Keep a Changelog](https://keepachangelog.com/). File-level detail: [FILE-CHANGE-LOG.md](FILE-CHANGE-LOG.md).

## [Unreleased]

### 2026-10-12: Design system "The Bridge Console" (M3 step 0)

**Added**
- `DESIGN.md` (Impeccable/DESIGN.md format) and `.impeccable/design.json` sidecar; `.impeccable/config.json` with the design detector hook enabled.
- Semantic status tokens `--success`, `--warning`, `--info` (light and dark) and matching `Badge` variants.
- Palette-tinted text selection and navy caret.

**Changed**
- Primary colour: neutral black → Harbour Navy `oklch(0.37 0.09 252)` (dark `oklch(0.8 0.07 252)`); cool console sidebar; navy focus ring and chart ramp.
- Light-theme destructive darkened for WCAG AA on its tint (3.99:1 → 4.95:1).

**Fixed**
- App header separator rendered as a stray full-height line (Radix-style `data-[orientation=vertical]` selector on a Base UI component).

**Reason:** a product-specific, accessible design system before building the feature screens.
**Affected areas:** theme tokens, Badge, app shell, docs. **Breaking changes:** none. **Migrations:** none.
**Verification:** lint ✅ · typecheck ✅ · unit 18/18 ✅ · build ✅ · `impeccable detect` no findings ✅ · desktop + mobile screenshot round ✅ · E2E 10/10 ✅.

### 2026-10-12: Impeccable UI/UX skill

**Added**
- Project-local `impeccable` skill (v4.5.2, `pbakaus/impeccable`, Apache-2.0) for UX/UI critique, audits and polish; recorded in `skills-lock.json` and `docs/AGENT-SKILLS.md`.

**Reason:** consistent, reviewable UI/UX quality for the M3 feature screens.
**Affected areas:** agent tooling and docs only; no application code. **Breaking changes:** none. **Migrations:** none.
**Verification:** installed as copies (62 files, no symlinks); discovered by Claude Code; global skill directories unchanged; launcher, browser scripts and hook behaviour reviewed. Engine and hooks deliberately not run (D-024).

### 2026-10-12: Schema, RLS and authentication (M2)

**Added**
- Six migrations: tenancy (organizations, profiles, memberships, roles), vessels, inspections + checklist items, work orders, handovers, audit log.
- RLS on every table, set-returning membership helpers in a private schema, column-level grants, no DELETE for any app role, no anon access.
- Database-enforced rules: IMO check digits, inspection and work-order status transitions, frozen completed inspections, failed checks require finding + severity, follow-up work orders must reference a failed item on the same vessel, immutable handovers acknowledged only by the recipient, trigger-written audit log with the real actor.
- `create_inspection` RPC (inspection + checklist in one transaction).
- Seed: two organizations, eight users across all five roles, realistic synthetic fleet data.
- 73 pgTAP tests; generated TypeScript DB types.
- Sign in / sign out, `/no-access`, authenticated sidebar shell and dashboard welcome card.
- Playwright E2E for the auth flow (desktop + mobile); unit tests for roles and redirect safety.

**Fixed**
- Email/password login was disabled by `[auth.email] enable_signup = false` (M1 config); re-enabled while keeping sign-ups disabled.
- Sign-out revoked all sessions of the account; now session-local.
- Supabase's legacy default privileges would have exposed new tables to `anon`; revoked in the first migration.

**Reason:** P0 security foundation before feature screens.
**Affected areas:** database, auth, app shell, tests, docs. **Breaking changes:** none (no prior schema).
**Migrations:** `20261012070232` … `20261012070240` (6 files).
**Verification:** `db reset` ✅ · `db:test` 73/73 ✅ · `db lint` ✅ · security advisors: no findings ✅ · lint ✅ · typecheck ✅ · unit 18/18 ✅ · build ✅ · E2E 10/10 (two consecutive runs) ✅.

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
