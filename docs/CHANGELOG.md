# Changelog

Meaningful functional and technical changes, newest first. Format loosely follows [Keep a Changelog](https://keepachangelog.com/). File-level detail: [FILE-CHANGE-LOG.md](FILE-CHANGE-LOG.md).

## [Unreleased]

### 2026-10-15: M4 verification

**Added**
- Accessibility gate: `@axe-core/playwright` 4.13.0 (pinned dev dependency) checks WCAG 2.2 A/AA on every route, signed out and in, desktop and Pixel 7 (`e2e/accessibility.spec.ts`).
- E2E isolation: Playwright `globalSetup` rebuilds the local database from the seed before every run (`supabase db reset --local`; `E2E_SKIP_DB_RESET=1` to skip).

**Fixed**
- The login and no-access pages had no level-1 heading.
- At 200% text the vessel, inspection and work-order tables clipped whole columns; lists now switch to wrapping stacked rows by their own width (container queries), titles wrap instead of truncating, and filter values wrap. Touch targets unchanged (44px).
- The intermittent mobile E2E failure: an unfiltered text locator matched a hidden duplicate (D-030). All user-facing text assertions now filter to visible elements; tenant-isolation checks are stricter (unfiltered).

**Changed**
- SECURITY.md: the `npm audit` note re-counted (9 entries, one `braces` advisory via the lint config and the `shadcn` CLI; tooling only).

**Reason:** M4 verification (D-040). **Affected areas:** lists, filters, auth pages, E2E, Vitest/Playwright config, docs. **Breaking changes:** none. **Migrations:** none.
**Verification:** unit 83/83 ✅ · lint/typecheck ✅ · pgTAP 85/85 ✅ · `impeccable detect` `[]` ✅ · E2E 54/54 ✅ three consecutive fresh-seed runs.

### 2026-10-15: Security headers

**Added**
- Content-Security-Policy and security headers on every response (`src/lib/security-headers.ts` via `next.config.ts`, D-039): no framing, no plugins, `connect-src 'self'`, `form-action 'self'`, `base-uri 'self'`, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`; `upgrade-insecure-requests` on Vercel only.
- Unit tests (3) and `e2e/security-headers.spec.ts` (headers present; zero CSP violations through the main screens).

**Reason:** the live site sent only HSTS. **Affected areas:** next.config, all responses. **Breaking changes:** none (inline scripts stay allowed; no third-party origins are used). **Migrations:** none.
**Verification:** unit 83/83 ✅ · typecheck/lint ✅ · E2E 48/48 ✅ twice in a row · production (`1944fd8`): all headers present on `/` and `/login`, including `upgrade-insecure-requests`; smoke test 31/31 with no console errors ✅.

### 2026-10-15: Deployed (M5)

**Added**
- Live demo at https://aegir-eight.vercel.app (Vercel) on Supabase Cloud (`ap-southeast-1`): 8 migrations applied, advisors clean, demo data from `scripts/demo-seed.mjs`.
- README: live URL and the four demo logins (password `ShipShape2026`, demo-only); administrator and the second organization stay unpublished (D-011).

**Changed**
- `scripts/demo-seed.mjs` exits quietly when psql closes the pipe early.

**Verification:** production smoke test 31/31 (DEPLOYMENT.md). Hosted `db advisors`: no issues.

### 2026-10-15: Hosted demo seed and deployment prerequisites

**Added**
- `scripts/demo-seed.mjs`: generates the hosted demo seed from `supabase/seed.sql`, with passwords supplied at run time (published demo logins vs a random private password for the admin and everyone else) and guards against weak passwords, missing variables and non-empty databases. Unit tests (`scripts/demo-seed.test.mjs`; Vitest now also runs `scripts/**/*.test.mjs`).
- DEPLOYMENT.md: scoped access-token permissions (read-only; writes need the database password) and the exact demo-seed procedure.

**Reason:** M5 preparation (D-011). **Affected areas:** scripts, Vitest config, docs. **Breaking changes:** none. **Migrations:** none. Nothing has been run against the hosted project.
**Verification:** unit 80/80 ✅ · lint ✅ · local end-to-end run of the demo seed ✅ (see TESTING.md).

### 2026-10-15: Dashboard accessibility pass (critique 28/40, audit 15/20)

**Changed**
- Summary figures jump to their own panel and focus follows; panel headers keep the links to full lists (D-038, supersedes D-035's figure links).
- "N assigned to you" is a header button; a failed check's work order opens from a "View work order" button. Both are 44px on touch.
- The Failed checks panel says how many rows it leaves out.
- Figure links read as sentences; the summary region is "Fleet summary"; the loading skeleton is announced and matches the layout.

**Fixed**
- At 200% text, row titles collapsed under their badges and figure signals were clipped (WCAG 1.4.4).
- App shell: "Skip to content" link, a `Main` navigation landmark with `aria-current="page"`, and no skeleton pulse under reduced motion.

**Added**
- Root `PRODUCT.md` pointer so Impeccable finds the product context (D-025).

**Reason:** Impeccable doctor, critique and audit of the dashboard; owner chose accessibility + touch first, light-only MVP, figures jump to panels. **Affected areas:** dashboard, app shell, skeleton, E2E. **Breaking changes:** none. **Migrations:** none.
**Verification:** unit 77/77 ✅ · lint/typecheck/build ✅ · `impeccable detect` `[]` ✅ · E2E 43/44 then 44/44 (one unexplained intermittent, see TESTING.md) · confirmation round at normal and 200% text ✅.

### 2026-10-15: Protect recorded failures; follow-up flow and urgency (from the re-critique)

**Added**
- Migration `20261015051635_protect_linked_failed_checks`: a failed check that a work order follows up can no longer change its result (P0001); pgTAP `08_linked_failed_checks` (7).

**Changed**
- Tapping Pass or N/A on a recorded failure asks first ("Replace this failure with Pass?"); on a failure with work raised, Pass and N/A are disabled with the reason shown.
- Raising a work order from a failed check returns to the inspection; its notice links to the new work order. The raise form's context shows the finding's severity.
- One live primary per sub-task: the block form hides the other status moves; Complete waits while a finding form or replace question is open.
- Work queues use tiered urgency (overdue critical/high → critical → other overdue → rest), on `/work-orders` and the dashboard (D-037, supersedes D-034's order).

**Fixed**
- **Safety (pre-existing since the inspections slice):** one tap on Pass or N/A erased a recorded finding and severity, even with a work order attached.
- Saved notices stayed hidden when a redirect returned to a page kept mounted by Cache Components (found in the visual round).

**Reason:** Impeccable re-critique (27/40); owner chose "confirm + lock if linked", tiered urgency, P1 then P2s. **Affected areas:** inspection_items trigger, inspections UI, work-order create flow and status actions, shared SavedNotice, urgency order, tests, docs. **Breaking changes:** none for users; queue order changes by design. **Migrations:** `20261015051635_protect_linked_failed_checks` (local only; not pushed anywhere).
**Verification:** pgTAP 85/85 ✅ (new file red first) · `db lint` ✅ · advisors no issues ✅ · types unchanged · unit 76/76 ✅ · lint/typecheck/build ✅ · `impeccable detect` `[]` ✅ · E2E 42/42 ✅ on four full runs (one earlier intermittent failure, unexplained, see TESTING.md) · desktop + Pixel 7 confirmation round ✅ after one fix.

### 2026-10-15: Inspection and work-order fixes from the Impeccable critique

**Changed**
- **Completing an inspection is confirmed** (D-036): the dialog states the result summary, warns that the checklist freezes and lists failed checks without a work order (with "Raise work order"). Completing anyway is allowed; the record then says "Inspection completed · N failed checks need a work order". Complete is repeated at the end of the checklist.
- A recorded failure collapses to its finding and severity badge with "Edit finding", instead of staying an open form with its own primary button.
- Severity is chosen from four cards that show each level's full guidance (shadcn `radio-group`), replacing a dropdown that truncated it.
- Inspections show Overdue beside their lifecycle status ("In progress · Overdue"), as work orders do.
- Select and menu items are 44px tall on touch screens (Deck Hand Rule).
- Record-section card titles (Checklist, History, Raised from a failed check, vessel cards) are `h2` headings.

**Fixed**
- Status icons inside alerts (blocked pause icon, saved-notice check) rendered in ink because the Alert forces `text-current`; they now carry their signal colour.

**Reason:** Impeccable critique of inspections + work orders (29/40), owner chose P1 + P2. **Affected areas:** inspections UI, work-order detail, shared saved notice, shadcn select / dropdown-menu / radio-group, E2E. **Breaking changes:** none. **Migrations:** none.
**Verification:** lint ✅ · typecheck ✅ · unit 75/75 ✅ · `impeccable detect` `[]` ✅ · E2E 42/42 ✅ twice in a row (the first full run failed 2/42 on a test locator: the "Record N more checks" hint now appears twice by design; the test was corrected) · desktop + Pixel 7 confirmation round: icon colour, h2s, 44px select items, 86px severity cards, no overflow, no console errors ✅.

### 2026-10-15: Live dashboard (M3 slice 4)

**Added**
- Dashboard with live figures: active vessels (of those in service), inspections due (overdue + next 7 days), open work orders (overdue, blocked), failed checks needing follow-up, pending handovers (and those for you). Each figure links to the list behind it.
- Queue panels: work queue (urgency order, "assigned to you" link), inspections due, failed checks (every unaddressed check, never truncated, with "Raise work order" for roles that may create work; recent addressed ones link to their work order), vessels needing attention (with the exact reason), pending handovers (yours first).
- `buildDashboard()` (pure, 16 unit tests) and `getDashboard()` (five parallel RLS-scoped reads). Playwright dashboard flows: organization queues and isolation, the failed-check → follow-up → work-raised loop with live figures and a viewer, per-user callouts.

**Changed**
- The welcome card is gone; the page uses `PageHeader` and a skeleton shaped like the dashboard.
- Vessel attention counting moved to `tallyAttention()` and is shared by the watch list and the dashboard.

**Fixed**
- Saving a vessel only refreshed `/vessels`; it now revalidates the app shell, so the dashboard and other lists show the new status (D-033).

**Reason:** P0 dashboard slice (PRODUCT.md workflow 7, principle 3). **Affected areas:** dashboard feature, vessels domain/DAL/actions, E2E, docs.
**Breaking changes:** none. **Migrations:** none (existing indexes cover every dashboard filter, D-035).
**Verification:** lint ✅ · typecheck ✅ · unit 75/75 ✅ · build ✅ · E2E 42/42 ✅ (two consecutive runs) · pgTAP 78/78 ✅ · `db lint` ✅ · `db advisors` no issues ✅ · `impeccable detect` (dashboard) `[]` ✅ · desktop + Pixel 7 screenshots, no console errors, no overflow ✅.
**Review:** Impeccable critique of inspections + work orders (the review the previous two slices left open): 29/40 Good, 2 P1 + 3 P2 findings recorded in TESTING.md; no fixes applied yet.

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
