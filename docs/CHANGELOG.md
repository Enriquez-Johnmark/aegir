# Changelog

Meaningful functional and technical changes, newest first. Format loosely follows [Keep a Changelog](https://keepachangelog.com/). File-level detail: [FILE-CHANGE-LOG.md](FILE-CHANGE-LOG.md).

## [Unreleased]

### 2026-10-15: Work orders (M3 slice 3)

**Added**
- Work orders queue: open, assigned to me, blocked, completed and all views; priority and vessel filters; overdue → priority → due-date order; overdue and blocked counts; table on desktop, stacked rows on mobile.
- Raise a work order (vessel, title, description, priority, due date, assignee), including **from a failed inspection check**: vessel fixed, title/description/priority prefilled from the finding, warning when work was already raised.
- Work order detail: status actions limited to legal moves (start, block with a required reason, resume, back to open, confirmed completion), blocked-reason callout, the failed check it follows up, and a **history timeline from the audit log** with real actor names.
- Manager-only edit page; assignees see status actions only.
- Inspections: "Raise work order" on failed checks; linked work orders open their detail. Vessel page: work-order titles link, "View all".
- Work orders in the sidebar. Unit tests (10) and Playwright work-order flows; the inspection E2E now raises the follow-up too.

**Changed**
- Vessel detail uses the shared work-order priority/status badges (priority icons for every level).
- `listVesselNames` moved from inspections to the vessels data layer.

**Reason:** P0 work-orders slice. **Affected areas:** work-orders feature, inspections checklist, vessel detail, sidebar, tests, docs.
**Breaking changes:** none. **Migrations:** none (schema, triggers and pgTAP from M2).
**Verification:** lint ✅ · typecheck ✅ · unit 59/59 ✅ · build ✅ · E2E 36/36 ✅ (two consecutive runs) · `impeccable detect` `[]` ✅ · desktop + mobile inspection round ✅. Impeccable critique for inspections and work orders: not run yet.

### 2026-10-15: Inspections (M3 slice 2)

**Added**
- Inspections list: open inspections oldest first (overdue lead), completed / cancelled / all views, vessel filter, checklist progress and findings (failed checks, follow-ups needed); table on desktop, stacked rows on mobile.
- Schedule form: vessel (preselected from a vessel page), date, title, inspector, notes and a checklist builder (add/remove checks, category suggestions, "Add from template" with three synthetic templates). Created atomically through the `create_inspection` RPC.
- Inspection detail: lifecycle actions (Start, Complete when nothing is pending, Cancel with confirmation), facts, checklist with one-tap Pass / N/A and a Fail panel (finding + severity), derived "Needs follow-up" flag and linked work orders.
- Vessel page: "Schedule inspection" action, inspection titles link to their detail, "View all".
- Inspections in the sidebar; shadcn `alert-dialog`, `toggle`, `toggle-group` (toggle gets 44px coarse-pointer targets).
- Unit tests (16) and Playwright inspection flows; pgTAP `07_inspection_results` (5).

**Changed**
- Vessel filters use the new shared `useUrlFilters` / `FilterSelect` (D-033); page-header actions wrap.

**Fixed**
- **Security (fix forward):** a former inspector whose role changed could still record results on a checklist they had been assigned (D-031, migration `20261014174645`).
- An inspector scheduling an inspection was left unassigned and could not conduct it; the inspector now defaults to them (D-032).

**Reason:** P0 inspections slice. **Affected areas:** inspections feature, vessels detail/filters, shared UI, RLS policy, tests, docs.
**Breaking changes:** none. **Migrations:** `20261014174645_require_inspector_role_for_item_updates.sql`.
**Verification:** lint ✅ · typecheck ✅ · unit 49/49 ✅ · build ✅ · pgTAP 78/78 ✅ · E2E 28/28 ✅ · db lint/advisors ✅ · `impeccable detect` `[]` ✅ · desktop + mobile inspection round ✅. Impeccable critique for this slice: not run yet.

### 2026-10-12: Vessels (M3 slice 1)

**Added**
- Vessels list as a **watch list**: "Attention first" default sort, Attention column (critical / overdue / blocked with icons), search, status/type filters, other sorts; table on desktop, stacked rows on mobile; whole-row click target.
- Vessel detail (facts, open work orders, inspections, overdue signals), add and edit forms (Base UI selects, server-side Zod validation incl. IMO check digit, duplicate-IMO field error, focus on first error, save confirmation).
- Breadcrumbs, per-vessel tab titles, forbidden/not-found/error states, `ButtonLink`, `SavedNotice`, shared `EMPTY_PANEL`; Vessels in the sidebar.
- Unit tests (IMO, schemas, attention ordering) and Playwright vessel flows.

**Changed**
- 44px controls on touch devices (`pointer-coarse:`), 32px on desktop.
- Vessel status badges neutralised; risk carries the colour.
- `vitest.config.ts` renamed to `vitest.config.mts` (explicit ESM; removes Vite's CJS-loader warning).

**Fixed**
- Links styled as buttons were announced as buttons (D-027).
- Sidebar `usePathname()` broke the build on dynamic routes under Cache Components (now suspended).
- "Clear filters" left the old search text; empty IMO showed two errors; avatar initials contrast 4.3:1 → AA.

**Reason:** P0 vessel management, then the Impeccable critique (25/40) with all P1/P2 findings fixed.
**Affected areas:** vessels feature, shared UI, base components, tests, docs. **Breaking changes:** none. **Migrations:** none.
**Verification:** lint ✅ · typecheck ✅ · unit 33/33 ✅ · build ✅ · E2E 20/20 ✅ · `impeccable detect` `[]` ✅ · desktop + mobile confirmation round ✅.

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
