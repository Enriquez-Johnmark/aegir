# Testing

A green build is not evidence of correctness. Tests target **business rules** and **security boundaries** first.

## Layers

| Layer | Tool | Location | What it proves |
|---|---|---|---|
| Unit | Vitest 5 | `src/**/*.test.ts` (colocated), `scripts/*.test.mjs` | Pure rules: transitions, Zod schemas, entry wording, URL params, redirects, env validation, demo seed/reset SQL |
| Database | pgTAP via `supabase test db` | `supabase/tests/*.test.sql` | Constraints, triggers, **RLS per role and organization**, audit immutability |
| Integration | Vitest against the local Supabase stack (D-049) | `integration/` ✅ | The real Server Actions and data layer, signed in as seeded users: TS ↔ DB status parity (D-006), every reachable error message, role checks, organization isolation in every read, sign-in |
| End-to-end | Playwright 1.64 (desktop + Pixel 7 projects) | `e2e/` ✅ | Critical user flows in a real browser against a production build |

## Commands

```bash
npm run lint          # ESLint (next/core-web-vitals + typescript)
npm run typecheck     # next typegen && tsc --noEmit
npm test              # Vitest unit tests (no database)
npm run test:integration   # Vitest against the LOCAL stack: resets the db from the seed, then 94 tests (needs db:start; INTEGRATION_SKIP_DB_RESET=1 skips the reset)
npm run db:start      # start local Supabase (Docker required)
npm run db:reset      # rebuild LOCAL db from migrations + seed
npm run db:lint       # plpgsql lint (supabase db lint)
npm run db:test       # pgTAP tests (supabase test db)
npx supabase db advisors --local   # security/performance advisors (CLI ≥ 2.81.3)
npm run build         # production build
npx playwright install chromium   # once, before the first E2E run
npm run test:e2e      # Playwright: resets the LOCAL db from the seed, builds, starts on :3100, runs e2e/ (needs db:start; E2E_SKIP_DB_RESET=1 skips the reset)
```

E2E runs serially locally (1 worker, 10 s expect timeout) because the Supabase stack plus parallel browsers saturates a laptop (D-021).

## Priorities

1. RLS isolation and role limits (see [SECURITY.md](SECURITY.md) §7).
2. State-transition rules (DB trigger and TS domain function).
3. Constraint rejections (invalid input reaches the DB and is rejected).
4. Critical E2E flows: sign in → dashboard → create vessel → record inspection with a failure → raise and progress a work order → create and acknowledge a handover → a viewer is blocked from writing.

## pgTAP pattern for RLS

Each test file runs in a transaction and rolls back. Fixture IDs come from the seed (D-018). Act as a user by switching role and JWT claims:

```sql
begin;
create extension if not exists pgtap with schema extensions;
select plan(2);
set local role authenticated;
set local "request.jwt.claims" to '{"sub": "a1000000-0000-4000-8000-000000000004", "role": "authenticated"}';

-- Errors: assert the SQLSTATE (42501 privilege/RLS, 23514 check, P0001 our triggers)
select throws_ok($$ insert into public.vessels (...) values (...) $$, '42501', null, 'technician cannot add vessels');

-- Silent RLS filtering (UPDATE affects 0 rows): act, then verify as postgres
update public.vessels set name = 'x' where id = 'b2000000-0000-4000-8000-000000000001';
reset role;
select is((select name from public.vessels where id = 'b2000000-…'), 'Meridian Star', 'cross-org edit had no effect');

select * from finish();
rollback;
```

## Current status (2026-10-16)

| Check | Result |
|---|---|
| Unit (`npm test`) | ✅ 148/148 in 17 files |
| Database (`npm run db:test`) | ✅ 135/135 in 12 files |
| Integration (`npm run test:integration`) | ✅ 94/94 in 5 files, on a fresh seed |
| End-to-end (`npm run test:e2e`) | ✅ 102/102 (51 tests × desktop and Pixel 7) on a fresh seed |
| Accessibility (axe, WCAG 2.2 AA, in E2E) | ✅ 0 violations on every route |
| Lint, typecheck, build | ✅ |
| `db lint --local`, `db advisors --local` | ✅ no errors, no issues |
| `npm audit --omit=dev` | ✅ 0 vulnerabilities (dev tooling: see SECURITY.md §9) |
| CI (`.github/workflows/ci.yml`, D-044) | Everything above except E2E, on every push and pull request. ✅ First run green ([run 38845362682](https://github.com/Enriquez-Johnmark/aegir/actions/runs/38845362682), 2 min, no annotations) |

## Results log

| Date | Command | Result |
|---|---|---|
| 2026-10-12 | `npm run lint` | ✅ pass (0 problems) |
| 2026-10-12 | `npm run typecheck` | ✅ pass |
| 2026-10-12 | `npm test` | ✅ 3/3 passed (`src/lib/env.test.ts`) |
| 2026-10-12 | `npm run build` | ✅ pass (`/` static, proxy registered) |
| 2026-10-12 | `next start` + curl smoke | ✅ `/` 200 with title "Aegir"; `/missing` 404; no server errors |
| 2026-10-12 | `npx supabase start` | ✅ local stack up (Postgres 17.11) |
| 2026-10-12 | `npm run db:reset` | ✅ 6 migrations + seed apply on a fresh DB |
| 2026-10-12 | `npm run db:test` | ✅ 73/73 (6 files) |
| 2026-10-12 | `npm run db:lint` / `db advisors` | ✅ no lint errors; no security findings; perf: only "unused index" on a fresh DB |
| 2026-10-12 | `npm test` | ✅ 18/18 (env, roles, safe-redirect) |
| 2026-10-12 | `npm run test:e2e` | ✅ 10/10 (5 auth tests × desktop + mobile) |
| 2026-10-12 | `impeccable detect --json` (globals.css, badge, auth/app routes, layout, features) | ✅ `[]` no findings |
| 2026-10-12 | Design inspection round (Playwright screenshots, desktop 1280×800 + Pixel 7: landing, login errors, dashboard) | ✅ after 1 fix: header separator used a Radix selector and rendered as a stray line |
| 2026-10-12 | `npm test` (after M3 vessels) | ✅ 33/33 (env, roles, safe-redirect, vessels: IMO, schemas, attention ordering) |
| 2026-10-12 | `npm run test:e2e` (after M3 vessels) | ✅ 20/20 (auth 5 + vessels 5, × desktop + mobile), three consecutive green runs after fixes |
| 2026-10-12 | Impeccable `critique` (vessels, dual-agent) | 25/40 Acceptable before fixes; all 3 P1 and 4 P2 issues fixed (D-027 – D-029); snapshot `.impeccable/critique/2026-10-12T09-13-47Z__src-app-app-vessels.md` |
| 2026-10-12 | Confirmation round after fixes | ✅ `impeccable detect` `[]`; 44px controls under `(pointer: coarse)`, 32px on desktop; focus moves to the first invalid field; screenshots desktop + mobile |
| 2026-10-12 | Token contrast (OKLCH→sRGB WCAG script) | ✅ all pairs ≥ 4.5:1 text, ring ≥ 3:1; shadcn default destructive-on-tint was 3.99:1 (fixed, D-026) |
| 2026-10-15 | `npm run db:test` (after M3 inspections) | ✅ 78/78 (7 files; new `07_inspection_results`, red against the old policy first) |
| 2026-10-15 | `npm run db:reset` | ✅ 7 migrations + seed apply on a fresh DB |
| 2026-10-15 | `npm test` (after M3 inspections) | ✅ 49/49 (+16 inspections: conduct rights, overdue, checklist summary, completion, schedule/result/list schemas) |
| 2026-10-15 | `npm run lint` / `npm run typecheck` / `npm run build` | ✅ (inspection routes partially prerendered) |
| 2026-10-15 | Design inspection round (desktop 1360×900 + Pixel 7: list, in-progress detail, fail form, completed detail, schedule form) | ✅ no console errors; one UX gap found by E2E and fixed (inspector default, D-032) |
| 2026-10-15 | `npm run test:e2e` (after M3 inspections) | ✅ 28/28 (auth 5 + inspections 4 + vessels 5, × desktop + mobile), two consecutive green runs. An earlier run failed at sign-in when the local Docker engine stalled after the machine slept (tests took 15–20 min against a 30 s timeout); not a code failure, rerun green |
| 2026-10-15 | `npm run db:lint` / `supabase db advisors --local` / `impeccable detect` (inspections UI) | ✅ no errors / no issues / `[]` |
| 2026-10-15 | `npm test` (after M3 work orders) | ✅ 59/59 (+10 work orders: transitions, status rights, overdue, urgency order, audit-event descriptions, schemas) |
| 2026-10-15 | `npm run lint` / `typecheck` / `build` / `impeccable detect` (work-orders UI) | ✅ / ✅ / ✅ (work-order routes partially prerendered) / `[]` |
| 2026-10-15 | `npm run test:e2e` (after M3 work orders) | ✅ 36/36 (auth 5 + inspections 4 + vessels 5 + work orders 4, × desktop + mobile), two consecutive green runs |
| 2026-10-15 | Design inspection round (desktop + Pixel 7: queue, blocked detail, block form, follow-up form, inspection with linked work) | ✅ no console errors, no defects found |
| 2026-10-15 | `npm test` (after M3 dashboard) | ✅ 75/75 (+16 dashboard: date window, fleet/work/inspection counts, failed-check retention and order, vessel attention, handovers, shared `tallyAttention`) |
| 2026-10-15 | `npm run lint` / `typecheck` / `build` / `impeccable detect` (dashboard UI) | ✅ / ✅ / ✅ (`/dashboard` partially prerendered) / `[]` |
| 2026-10-15 | `npm run test:e2e` (after M3 dashboard) | ✅ 42/42 (auth 5 + dashboard 3 + inspections 4 + vessels 5 + work orders 4, × desktop + mobile), two consecutive green runs (fresh seed, then on the first run's data) |
| 2026-10-15 | `npm run db:test` / `db:lint` / `supabase db advisors --local` | ✅ 78/78 / no errors / no issues (no migration in this slice) |
| 2026-10-15 | Design inspection round (desktop 1360×900 + Pixel 7, manager and inspector) | ✅ no console errors, no overflow; 4 fixes after the first round (card bottom band, vessel reason text, link labels, copy length) |
| 2026-10-15 | Impeccable `critique` (inspections + work orders, dual-agent, one combined run) | 29/40 Good; 0 P0, 2 P1 (inspection completion unconfirmed and silent; recorded failures stay as open forms), 3 P2; detector `[]` and overlay only `overused-font` (false positive). **Not fixed yet**, awaiting the owner's priorities (→ fixed in D-036). Snapshots `.impeccable/critique/2026-10-15T04-09-20Z__src-app-app-{inspections,work-orders}.md` |
| 2026-10-15 | `npm run test:e2e` (after the critique fixes) | ⚠️ 40/42 first run: both projects failed on a strict-mode locator (the completion hint is intentionally shown twice); test corrected → inspections 8/8 → full suite ✅ 42/42 twice in a row |
| 2026-10-15 | Confirmation round for the critique fixes (desktop + Pixel 7) | ✅ blocked icon amber (computed colour), `h2` card titles, select items 44px coarse / 28px fine, severity cards 86px, no overflow, no console errors |
| 2026-10-15 | Impeccable re-critique (inspections + work orders, fresh dual-agent run after the D-036 fixes) | 27/40 Acceptable (29 → 27: different independent reviewer; all five earlier issues verified resolved). New **P1, pre-existing since the inspections slice**: tapping Pass/N/A on a recorded failure saves at once and erases its finding and severity, even with a linked work order (verified in code: `recordResultSchema` nulls them). 3 P2 + 1 P3. Detector `[]`; overlay only `overused-font` (false positive). **Not fixed yet**, awaiting the owner (→ fixed in D-037). Snapshots `.impeccable/critique/2026-10-15T04-55-22Z__src-app-app-{inspections,work-orders}.md` |
| 2026-10-15 | `npm run db:test` (after `protect_linked_failed_checks`) | ✅ 85/85 (8 files; new `08_linked_failed_checks` 7/7, red first: 5/7 failed against the old schema). A later run failed 03 #9 and 08 #4 because manual/agent clicking had changed the seeded fixtures; `db:reset` → 85/85 again |
| 2026-10-15 | `npm test` (after D-037) | ✅ 76/76 (tiered urgency: tests written first and seen failing; dashboard queue expectation updated to the new order) |
| 2026-10-15 | `npm run test:e2e` (after D-037) | ⚠️ 41/42 once: the desktop dashboard follow-up test did not find the "Needs follow-up" row within 10 s (that run was ~4× slower; the failure snapshot shows the row present). Not reproduced in 18/18 repeats of the spec and 4 later full runs (42/42 ×2, then 42/42 ×2 after the notice fix). Root cause **not identified**; recorded as intermittent |
| 2026-10-15 | Confirmation round for D-037 (desktop + Pixel 7) | Found a real bug: after raising work from a check, the inspection's "Work order raised" notice stayed hidden (stale `SavedNotice` state on a reused page). Reproduced in E2E (red), fixed, green; then all checks pass: Complete disabled while a form is open, focus on "Keep the failure", Pass disabled on linked failures, no other primary beside the block form, no overflow, no console errors |
| 2026-10-15 | `db:lint` / `db advisors --local` / `impeccable detect` (all changed UI) | ✅ no errors / no issues / `[]` |
| 2026-10-15 | Impeccable `doctor` | 1 mention: `.impeccable/design.json` sidecar older than DESIGN.md (refresh via `document`, not run). Product context fixed with a root `PRODUCT.md` pointer (D-025) |
| 2026-10-15 | Impeccable `critique` (dashboard, dual-agent) | 28/40 Good; 3 P1 (200% text layout, page ignores who is looking, 20px stacked work-order link), 6 P2. Detector `[]`; overlay only `overused-font`. **Not fixed yet** (→ fixed in D-038). Snapshot under `.impeccable/critique/` (slug `src-app-app-dashboard`) |
| 2026-10-15 | Impeccable `audit` (dashboard) | 15/20 Good (a11y 3, performance 4, theming 3, responsive 2, integrity 3); P1: row titles and figure badges break at 200% text (WCAG 1.4.4), 20px work-order link (2.5.8); P2: silent Failed-checks truncation, shell landmarks/skip link, dark theme unreachable. Light-mode contrast all ≥ 4.7:1; LCP 360–430 ms, CLS 0, 6 DB requests per render. **Not fixed yet** (→ fixed in D-038) |
| 2026-10-15 | Dashboard fixes (D-038): unit + targeted E2E | ✅ unit 77/77 (truncation total, red first); dashboard + auth specs 18/18 incl. new skip-link / `aria-current` test and figure-jump focus |
| 2026-10-15 | Confirmation round (desktop 1360, Pixel 7, 320px; normal and 200% text) | ✅ narrowest row title 192–288px at 200% (was 0–27px); no clipped badges; figure grid 5→2→1 columns; no Pixel 7 control under 44px (the 20px work-order link and 18px "assigned to you" are gone); no overflow; no console errors |
| 2026-10-15 | `npm run test:e2e` (after D-038) | ⚠️ 43/44 then ✅ 44/44. The failure was the mobile "a viewer follows inspections" test (not touched by this change); 10/10 in repeats; error output not captured. **Second unexplained intermittent** (see Known gaps) |
| 2026-10-15 | `impeccable detect` (dashboard, app shell, layout) | ✅ `[]` |
| 2026-10-15 | Demo seed (`scripts/demo-seed.mjs`), local end-to-end | ✅ unit 3 (admin never published; password replaced exactly once; refuses an unrecognised seed). Against `db reset --no-seed`: weak password, missing variable (psql exit 3) and re-run refused; 0 output lines contain a password; sign-in via the Auth API: published manager 200 with demo / 400 with local password, admin 400 with demo / 200 with private, other organization 400 with demo; pgTAP 85/85 on the demo-seeded DB. Local seed restored afterwards |
| 2026-10-15 | Hosted Supabase (`lerdmictefgrcmbovlft`): `db push` + `migration list` + `db advisors --linked` | ✅ 8/8 migrations applied, local = remote, advisors "No issues found" |
| 2026-10-15 | Production smoke test (https://aegir-eight.vercel.app) | ✅ 31/31, see DEPLOYMENT.md log (read-only and permission checks; no data created) |
| 2026-10-15 | Security headers (D-039): unit + E2E | ✅ unit 83/83 (+3 header tests); E2E 48/48 twice in a row (+2 tests × 2 projects: headers on `/` and `/login`; no CSP violation across sign-in, dashboard, lists, the raise form and a select popup) |
| 2026-10-15 | Production after the header deploy (`1944fd8`) | ✅ headers live on `/` and `/login`; smoke test 31/31, no console errors |
| 2026-10-15 | axe (`e2e/accessibility.spec.ts`, WCAG 2.2 A/AA) | ✅ 0 violations on 2 signed-out + 13 signed-in routes + the open Fail panel, desktop and Pixel 7, after giving the login and no-access pages an `h1`. Sanity: 22 rules pass on `/login`; injected `image-alt` / `button-name` failures are caught |
| 2026-10-15 | Lists and filters at 200% text (desktop 1360, Pixel 7) | Before: desktop tables clipped whole columns (Priority, Status, half of Due) behind `overflow-hidden`; work-order titles truncated even at normal size; phone filter values clipped. After (container queries, wrapping titles and values): no overflow, no clipping (only intentional `sr-only`), titles ≥ 348px; filter triggers 32px desktop / 44px Pixel 7 (a first attempt regressed them to 38px; caught by measurement and fixed) |
| 2026-10-15 | `npm run test:e2e` with `globalSetup` reset (3 consecutive runs) | ⚠️ 54/54, 53/54, 54/54: the mobile viewer inspection test failed once, with output kept: a text locator matched a hidden duplicate (D-040, refining D-030). Fixed by applying the `visible` filter to every user-facing text assertion (isolation checks stay unfiltered) → ✅ 54/54 ×3 consecutive |
| 2026-10-15 | `npm test` / lint / typecheck / `impeccable detect` / pgTAP (fresh seed) | ✅ 83/83 / 0 problems / ✅ / `[]` / 85/85 |
| 2026-10-15 | Handovers slice: unit + pgTAP | ✅ unit 92/92 (+9 handovers: acknowledge rights, inbox order, schema rules and limits, list params; +1 `formatDateTime`); pgTAP 90/90 (+`09_handover_access` 5: viewer can't send, other organization can't read/write/link, sender can't acknowledge; these describe existing rules, so green from the start) |
| 2026-10-15 | Impeccable critique (handovers, dual-agent) + audit | 29/40 Good; audit 16/20 Good. Fixed before commit: tasks-first record, honest acknowledge copy, the "All" view bug (also in work orders and inspections since their slices; new `e2e/filters.spec.ts` proven to fail against the old code), container-query fact grids on all four record pages, form selects wrap and follow the container, roles in the picker, date + hour in the inbox and dashboard, raw URL values never shown in filters, `h1` on all four not-found pages |
| 2026-10-15 | Measurement round (320, 768, Pixel 7 at 200% text) | ✅ tasks before Acknowledge everywhere; fact columns ≥ 186px (were 16px); no clipped selects. Known: at 768px + 200% root font the app shell's 16rem sidebar still forces sideways scroll on every page (pre-existing; browser text-size settings scale rem breakpoints too, the CSS-root simulation doesn't) |
| 2026-10-15 | `npm run test:e2e` after the handovers slice (fresh seed each run) | ✅ 68/68 twice in a row (+ handovers 5 flows, filters 2, axe on 3 new routes; × desktop + mobile) |
| 2026-10-15 | Audit slice: unit + pgTAP | ✅ unit 109/109 (+19 audit: entry wording per record type, lead field first, creation details, long text named, unknown columns kept, bookkeeping ignored, malformed payloads and dates degrade, people ids, snapshots, day grouping, URL params; −2 work-order history tests moved into them); pgTAP 96/96 (+`10_audit_log_access` 6: one transaction shares a timestamp (the paging tie-break), a viewer reads the whole organization's log and every record type, resolves every actor's name, can't delete; another organization can't resolve our actors. These describe existing rules, so green from the start) |
| 2026-10-15 | Impeccable critique (audit, dual-agent) + audit | 28/40 Good; audit 16/20 Good; detector `[]`; axe 0 violations on 8 screens. Fixed before commit: failed checks lead with their result and seeded results show on creation, entries name their inspection and vessel, paging bounded for an index seek, unknown person filter named, pager survives an unreadable page, "by" before actors, page summary names filters, whole-row links, seed attribution note, UUID/malformed-payload hardening. Found on the way (pre-existing, also on production): the phone menu sheet stayed open over the page after following a link; fixed and covered by `e2e/audit.spec.ts` |
| 2026-10-15 | `npm run test:e2e` after the audit slice (fresh seed each run) | ✅ 76/76 twice in a row (+ audit 4 flows, axe on 2 new routes; × desktop + mobile). Before the fixes the first full run was 72/76: two existing locators (`vessels`, `work-orders`) matched the new History card's text; scoped to the badge and to the "to" read after the arrow |
| 2026-10-16 | Independent review (four read-only reviewers: security, database, tests, docs) | No Critical issues. Confirmed and fixed (D-043): see SECURITY.md §8. Tests found: the audit E2E hard-coded a date the seed computes from today (failing from 2026-10-16); no pgTAP read-isolation test for vessels, inspections, checks or work orders; two isolation checks were wrongly `visible`-filtered and five text locators weren't; the dashboard figure helper didn't retry |
| 2026-10-16 | `npm run db:test` after `20261016000517_harden_after_independent_review` | ✅ 135/135 (+ `11_review_hardening` 11, six red against the previous schema; + `12_read_isolation` 28). Races reproduced with two sessions before, waiting on the new lock after |
| 2026-10-16 | `npm test` | ✅ 116/116 (+ deleted audit entries, 3 redirect normalisation cases (red first), 3 demo-reset SQL tests) |
| 2026-10-16 | `scripts/demo-reset.mjs` against the local database | ✅ visitor edit removed; two consecutive resets each restored the seeded counts; refused without `confirm` and with a third organization present |
| 2026-10-16 | `npm run test:e2e` after the review fixes (fresh seed each run) | ✅ 76/76 twice in a row (audit date read from the page, session cookies asserted `httpOnly`, isolation unfiltered, figures read from accessible names) |
| 2026-10-16 | Hosted Supabase: `migration list`, `db push --dry-run`, `db push`, `db advisors --linked` (owner) | ✅ migration 9 applied (only it pending in the dry run); ⚠️ advisors: one Auth warning, `auth_leaked_password_protection` (Pro-plan feature; SECURITY.md §9), no database findings |
| 2026-10-16 | Production after the review-fixes deploy (`ff04991`) | ✅ smoke 45/45, no console errors; session cookie `HttpOnly`, `Secure`, `SameSite=Lax` |
| 2026-10-16 | Toolchain update: Node 24.14.0 → 24.22.0 (LTS, npm 11.19.1), Supabase CLI 2.120.0 → 2.121.0 | ✅ lint, typecheck, unit 116/116, build; `db lint --local`, pgTAP 135/135, `db advisors --local` no issues; E2E 76/76 (fresh seed) |
| 2026-10-16 | CI rehearsal (D-044) | ✅ actionlint 1.7.12 clean. App job in a clean `git archive` with `npm ci` and placeholder Supabase values: lint, typecheck, unit 116/116, build, `npm audit --omit=dev` 0. Database job on a Postgres-only `db start` (migrations + seed): db lint, pgTAP 135/135, advisors (INFO only), generated types unchanged |
| 2026-10-16 | CI gates fail when they should | ✅ advisors `--fail-on warn` exit 1 on a table without RLS; db lint `--fail-on error` exit 1 on a function reading a missing table; pgTAP exit 1 on a failing test. ⚠️ Found: with the CLI's agent detection on, `--fail-on` exits 0 even on an ERROR finding; CI passes `--agent no` |
| 2026-10-16 | Sign-in refused by the rate limit (E2E, simulated 429) | Red first: Next's whole-page "This page couldn't load". ✅ After `login/error.tsx`: sign-in card, heading focused, retry signs in; desktop + Pixel 7 |
| 2026-10-16 | Full checks after D-044 | ✅ lint, typecheck, unit 116/116, build; db lint/pgTAP 135/135/advisors with the CI flags on a fresh reset; E2E 78/78 (fresh seed); detector no findings |
| 2026-10-16 | First CI run on GitHub (`1dcb00d`, run 38845362682) | ✅ both jobs green in 2m3s, no annotations: unit 13 files, build, audit 0; all 9 migrations + seed, db lint no errors, pgTAP 135/135, advisors no issues, types in sync |
| 2026-10-16 | Vercel firewall rule on the live site (D-044) | ✅ 11 bare `POST /login` (no form data, nothing reaches Supabase): 1–10 → 405 from the app, 11th → 429 with `x-vercel-mitigated: deny`; `GET /login` 200 while blocked |
| 2026-10-16 | Landing page (D-046): unit, build | ✅ unit 130/130 (+14 demo accounts: each published role pre-fills its email; repeated, empty, admin, other-organization, email-shaped, wrong-case and non-string values pre-fill nothing); build marks `/` static (○) |
| 2026-10-16 | Landing page: screenshot rounds (desktop 1440, Pixel 7, 1360 at 200% text; local production build) | Round 1: the hero showed the neutral dark grey, not navy. Turbopack's build cache had served the previous `globals.css`, so `.dark.night` and its keyframes were missing from the CSS; a clean `.next` fixed it. At 200% text the two-column sections squeezed their screenshots to 16px, so they moved to rem container queries. Round 2: no overflow, no broken images, no console errors on all three |
| 2026-10-16 | Landing page: Impeccable finish review (fresh reviewer, degraded role file) | `fix`, then `ship` after two verdict rounds. Fixed: lit badges anchored over the right chips, visible "Sign in" per role, one-sentence lede, phone zoom crops, DESIGN.md. Declined with reasons: dark-theme recaptures (light-only app, D-038), wider step-1 phone crop (text would shrink to ~8px) |
| 2026-10-16 | `e2e/landing.spec.ts` | ✅ 14/14 (7 × 2). The 320px + 200% text test was red first (35px sideways scroll from the header and role rows clipping "Sign in") |
| 2026-10-16 | Full verification after the landing page | ✅ lint · typecheck · unit 130/130 · build · `npm audit --omit=dev` 0 · `db reset --local` · `db lint` no errors · pgTAP 135/135 · advisors no issues · types unchanged · E2E 92/92 on a fresh seed (axe: 0 violations on `/`, desktop and Pixel 7) · smoke script landing checks 14/14 against the local build |
| 2026-10-16 | Production smoke after the landing deploy (`688ff66`) | ⚠️ 57/59 → explained: all 14 landing checks pass on desktop and Pixel 7. The 2 failures were the script counting links before the streamed sections arrived; a diagnostic sign-in found 0 immediately and then 2 handover rows and 20 audit check entries |
| 2026-10-16 | `scripts/smoke.mjs` (now in the repo, waits for streamed sections) against production | ✅ 59/59, no console errors; the two former failures pass (2 handover rows, 20 check entries) |
| 2026-10-16 | After pinning `engines` to `"24.x"` (D-047) | ✅ `npm ci --dry-run` · lint · typecheck · unit 130/130 · build (`/` static) |
| 2026-10-16 | App shell with enlarged text: reproduction (manager, 8 pages; local production build) | Before: root 200% at 768px: every page scrolled sideways by 64–432px (sidebar 512px); at 1024px `/work-orders/new` by 176px (fixed-width assignee select). Default font 32px (`Page.setFontSizes`): at 1024 and 1360px no rail and the menu button opened nothing, so the navigation was unreachable (CSS `md:` at 48rem = 1536px vs `useIsMobile` at 768px). At 412px, list badges ran 31–60px past the edge. After (D-048): navigation reachable and no sideways scroll at 412, 768, 820, 1024, 1360 and 1600px, both ways and at normal size; every nav label fits at 200% (a 33vw cap cut "Work orders" short, so the cap is 40vw) |
| 2026-10-16 | `e2e/enlarged-text.spec.ts` | ✅ 10/10 (5 × 2). Red against the old code first: navigation not found at 1024/1360px, sideways scroll on `/dashboard` (412px, 768px) and `/work-orders/new` (176px) |
| 2026-10-16 | Full verification after D-048 | ✅ lint · typecheck · unit 130/130 · build (`/` static) · `db reset --local` · `db lint` no errors · pgTAP 135/135 · advisors no issues · types unchanged · E2E 102/102 on a fresh seed |
| 2026-10-16 | Production after the D-048 deploy (`a67c7b5`, CI run 38880117890 green) | ✅ smoke 59/59, no console errors |
| 2026-10-16 | Enlarged text on production (one viewer sign-in, 6 pages per case) | ✅ 5/5: navigation reachable and no sideways scroll with a 32px default font at 412, 1024 and 1360px and a 200% root font at 768 and 1024px |
| 2026-10-16 | `npm run test:integration` (D-049) | ✅ 94/94 from a fresh seed (about 40 s) and again on the same data (about 3 s): work orders 34, inspections 28, handovers 13, vessels 10, sign-in and isolation 9. Every test passed on its first run, so the suite was checked for teeth: making `open → completed` allowed in TS, dropping `scheduled → cancelled`, changing one error-message match and one acknowledgement message each failed the matching test (reverted). Two failures from the first runs were in the tests themselves (an IMO reused across reruns; a Meridian test vessel named like Northwind data), fixed |
| 2026-10-16 | Full verification after D-049 | ✅ lint · typecheck · unit 132/132 · build (`/` static) · `db reset --local` · `db lint` no errors · pgTAP 135/135 · advisors no issues · types unchanged · integration 94/94 · E2E 102/102 on a fresh seed |
| 2026-10-24 | Next.js 16.4.0 → 16.4.3 (security) | ✅ `npm audit --omit=dev` 0 (was 1 critical); full audit still lists 6 existing dev-only advisories (shadcn CLI, undici, body-parser, fast-uri, zod under `@shadcn/registry`) |
| 2026-10-24 | Landing page for people who are hiring (D-050): screenshot rounds (1440, 1280, 1024, 768, 390; dev server) | Round 1: lit signals on screen at 1024/1280/1440 (were off below ~1370); 146px and 508px sideways scroll at 768 and 390 from the code blocks widening an unsized grid → `grid-cols-1`. The link-preview image redirected to `/login` (proxy) → matcher skips it. Round 2: no overflow at any width, no console errors |
| 2026-10-24 | `src/features/landing/excerpt.test.ts` | ✅ 3/3: the quoted rule and test match their files at the linked lines |
| 2026-10-24 | Full verification after D-050 | ✅ lint · typecheck · unit 135/135 · build (`/` and `/opengraph-image` static) · `db lint` no errors · pgTAP 135/135 · advisors no issues · integration 94/94 · E2E 108/108 on a fresh seed (axe: 0 violations on `/` and `/login`, desktop and Pixel 7) · smoke script landing checks 18/18 against the local build. Types not regenerated (no migration). Production smoke not run (not deployed) |
| 2026-10-24 | CI and production after D-050 (`1f2dcac`, run 40063144187) | ✅ both CI jobs green (audit step clean on Next 16.4.3). Vercel deployed; `LANDING_ONLY=1` smoke against https://aegir-eight.vercel.app 18/18 on desktop and Pixel 7, including the preview image served signed out (`og:image` absolute on the production domain). Signed-in smoke not run (no app-screen change) |
| 2026-10-24 | Product page for users and clients (D-051): screenshot rounds (1440, 1024, 390; local production build) | Round 1: no overflow, no console errors on `/`, `/engineering`, `/login`, `/login?as=technician`. The "Full size" chip covered the Acknowledged badge (bottom right), then the app's own buttons (top right) → a muted line under each frame. Round 2: clean |
| 2026-10-24 | E2E after D-051, first full run | ⚠️ 108 passed, 4 failed (2 × 2 projects): axe `target-size` on the stacked pgTAP links on `/engineering` (→ 24px rows), and 170px sideways scroll on `/` at 320px with 200% text (header actions and the LinkedIn button didn't wrap; long words in the trust facts → `wrap-break-word`). Two later runs stopped in global setup on a local `db reset` container error (`DbSetupError: error running container: exit 1`); a retry reset cleanly |
| 2026-10-24 | Full verification after D-051 | ✅ lint · typecheck · unit 136/136 · build (`/`, `/engineering`, `/opengraph-image` static) · `db lint` no errors · pgTAP 135/135 · advisors no issues · integration 94/94 · E2E 112/112 on a fresh seed (axe 0 violations on `/`, `/engineering`, `/login`, `/login?as=technician`, desktop and Pixel 7) · smoke landing checks 20/20 against the local build. Production smoke not run (not deployed) |
| 2026-10-24 | CI and production after D-051 (`2890fb7`, run 40066279048; deployed from `e2c0272`) | ✅ both CI jobs green. Vercel created no deployment for the push of `2890fb7`; an empty commit triggered it. `LANDING_ONLY=1` smoke against https://aegir-eight.vercel.app 20/20 on desktop and Pixel 7: 7 screenshots, the client close, `/engineering` public (200, no redirect), the preview image signed out. Signed-in smoke not run (no app-screen change beyond `/login`, which the landing checks cover) |
| 2026-10-24 | Live sign-in outage, diagnosis (D-052) | ⚠️ `lerdmictefgrcmbovlft.supabase.co` NXDOMAIN while `supabase.co` and `api.supabase.com` resolved; 8 days without activity. By hand against unreachable hosts: postgrest-js returns status 0 with an empty code, and auth-js returns `AuthRetryableFetchError` (status 0), which the old action showed as "Invalid email or password." Locally, an anonymous `HEAD` on `vessels` is 401 with no body and a `GET` is 401 with `42501`, so the ping uses a GET |
| 2026-10-24 | Full verification after D-052 | ✅ lint · typecheck · unit 148/148 (+ `sign-in-error`, `keepalive`) · build (`/api/keepalive` dynamic ƒ; `/`, `/engineering` static) · `db lint` no errors · pgTAP 135/135 · advisors no issues · integration 95/95 (+ the keep-alive route signed out) · E2E 114/114 on a fresh seed (+ keep-alive public and uncached). Production not run: the hosted project is unreachable until the owner restores it |
| 2026-10-24 | Production after D-052 (`031a392`, CI run 40069370021) | ✅ owner restored the project; hostname resolves again. CI green; Vercel deployed `031a392`. `GET /api/keepalive` → 200 `{"ok":true}`. Full smoke test (with the four demo sign-ins) 67/67 on desktop and Pixel 7 |

## Known gaps

- **CI doesn't run the integration suite yet** (D-049): CI's database job starts Postgres alone, and the suite also needs Auth and the API. Run it locally before pushing a change to an action, a mutation or a trigger.
- Three error branches can't be reached through the actions and stay untested (D-049): work orders' `42501` "Only managers…", inspections' `23514` "finding and severity", and the "needs at least one checklist item" trigger error.
- **CI doesn't run E2E** (D-044): it needs the whole Supabase stack and about five minutes, so it stays a local check before pushing. The Vercel firewall's rate limit itself can only be checked on the live site; E2E covers the page's handling of its 429.
- axe covers WCAG 2.2 A/AA rules only; it cannot judge everything (e.g. whether a heading names its section well). The dashboard and inspection/work-order critiques cover the rest.
- pgTAP uses the seed as its fixture (D-018): run `npm run db:reset` before `npm run db:test` after any manual, agent or screenshot clicking in the local app, or seeded-row tests fail on drifted data.
- Intermittent E2E failures: the mobile inspections viewer failure was explained and fixed (hidden duplicate matched by an unfiltered text locator, D-040). The earlier dashboard one (row not found within 10 s, ~4× slower run) hasn't recurred in 6 fresh-seed runs; it stays listed until it has a clean history. When a test fails, keep the log and `test-results/` (traces are retained on failure) before rerunning.
- E2E covers authentication, dashboard, vessels, inspections, work orders, handovers and the audit log. Dashboard tests compare figures before and after their own actions instead of asserting global totals (D-030).
- Tests that change state create their own records (seeded work orders and inspections are never moved), and since M4 every run also starts from a fresh seed (`e2e/global-setup.ts` runs `supabase db reset --local`; `E2E_SKIP_DB_RESET=1` skips it for quick reruns of one spec).
- Turbopack's build cache once served a stale `globals.css` to `next build` (2026-10-16): new rules were missing from the CSS while the TSX changes were live. If a CSS change doesn't show up in a build, delete `.next` and rebuild before debugging the CSS.
- Inputs with a `list` (datalist) are exposed as `combobox`, not `textbox`; locate them by that role.
- E2E locator policy under Cache Components: see D-030 and D-040 (role locators, `visible` filter for text, scoped to `main`; isolation checks stay unfiltered, since a hidden leak is still a leak).
- E2E runs leave their records in the local database until the next run's reset; pgTAP needs a fresh seed too (`npm run db:reset` before `npm run db:test`).
