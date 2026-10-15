# Testing

A green build is not evidence of correctness. Tests target **business rules** and **security boundaries** first.

## Layers

| Layer | Tool | Location | What it proves |
|---|---|---|---|
| Unit | Vitest 5 | `src/**/*.test.ts` (colocated) | Pure rules: transitions, Zod schemas, DTO mapping, env validation |
| Database | pgTAP via `supabase test db` | `supabase/tests/*.test.sql` | Constraints, triggers, **RLS per role and organization**, audit immutability |
| Integration | Vitest against the local Supabase stack | `tests/integration/` (⬜, M3) | DAL and Server Action behaviour with real sessions; TS↔DB transition parity |
| End-to-end | Playwright 1.64 (desktop + Pixel 7 projects) | `e2e/` ✅ | Critical user flows in a real browser against a production build |

## Commands

```bash
npm run lint          # ESLint (next/core-web-vitals + typescript)
npm run typecheck     # next typegen && tsc --noEmit
npm test              # Vitest unit tests
npm run db:start      # start local Supabase (Docker required)
npm run db:reset      # rebuild LOCAL db from migrations + seed
npm run db:lint       # plpgsql lint (supabase db lint)
npm run db:test       # pgTAP tests (supabase test db)
npx supabase db advisors   # security/performance advisors (CLI ≥ 2.81.3)
npm run build         # production build
npm run test:e2e      # Playwright: builds, starts on :3100, runs e2e/ (needs db:start + db:reset)
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
| 2026-10-15 | Impeccable `critique` (inspections + work orders, dual-agent, one combined run) | 29/40 Good; 0 P0, 2 P1 (inspection completion unconfirmed and silent; recorded failures stay as open forms), 3 P2; detector `[]` and overlay only `overused-font` (false positive). **Not fixed yet**, awaiting the owner's priorities. Snapshots `.impeccable/critique/2026-10-15T04-09-20Z__src-app-app-{inspections,work-orders}.md` |
| 2026-10-15 | `npm run test:e2e` (after the critique fixes) | ⚠️ 40/42 first run: both projects failed on a strict-mode locator (the completion hint is intentionally shown twice); test corrected → inspections 8/8 → full suite ✅ 42/42 twice in a row |
| 2026-10-15 | Confirmation round for the critique fixes (desktop + Pixel 7) | ✅ blocked icon amber (computed colour), `h2` card titles, select items 44px coarse / 28px fine, severity cards 86px, no overflow, no console errors |
| 2026-10-15 | Impeccable re-critique (inspections + work orders, fresh dual-agent run after the D-036 fixes) | 27/40 Acceptable (29 → 27: different independent reviewer; all five earlier issues verified resolved). New **P1, pre-existing since the inspections slice**: tapping Pass/N/A on a recorded failure saves at once and erases its finding and severity, even with a linked work order (verified in code: `recordResultSchema` nulls them). 3 P2 + 1 P3. Detector `[]`; overlay only `overused-font` (false positive). **Not fixed yet**, awaiting the owner. Snapshots `.impeccable/critique/2026-10-15T04-55-22Z__src-app-app-{inspections,work-orders}.md` |
| 2026-10-15 | `npm run db:test` (after `protect_linked_failed_checks`) | ✅ 85/85 (8 files; new `08_linked_failed_checks` 7/7, red first: 5/7 failed against the old schema). A later run failed 03 #9 and 08 #4 because manual/agent clicking had changed the seeded fixtures; `db:reset` → 85/85 again |
| 2026-10-15 | `npm test` (after D-037) | ✅ 76/76 (tiered urgency: tests written first and seen failing; dashboard queue expectation updated to the new order) |
| 2026-10-15 | `npm run test:e2e` (after D-037) | ⚠️ 41/42 once: the desktop dashboard follow-up test did not find the "Needs follow-up" row within 10 s (that run was ~4× slower; the failure snapshot shows the row present). Not reproduced in 18/18 repeats of the spec and 4 later full runs (42/42 ×2, then 42/42 ×2 after the notice fix). Root cause **not identified**; recorded as intermittent |
| 2026-10-15 | Confirmation round for D-037 (desktop + Pixel 7) | Found a real bug: after raising work from a check, the inspection's "Work order raised" notice stayed hidden (stale `SavedNotice` state on a reused page). Reproduced in E2E (red), fixed, green; then all checks pass: Complete disabled while a form is open, focus on "Keep the failure", Pass disabled on linked failures, no other primary beside the block form, no overflow, no console errors |
| 2026-10-15 | `db:lint` / `db advisors --local` / `impeccable detect` (all changed UI) | ✅ no errors / no issues / `[]` |
| 2026-10-15 | Impeccable `doctor` | 1 mention: `.impeccable/design.json` sidecar older than DESIGN.md (refresh via `document`, not run). Product context fixed with a root `PRODUCT.md` pointer (D-025) |
| 2026-10-15 | Impeccable `critique` (dashboard, dual-agent) | 28/40 Good; 3 P1 (200% text layout, page ignores who is looking, 20px stacked work-order link), 6 P2. Detector `[]`; overlay only `overused-font`. **Not fixed yet.** Snapshot under `.impeccable/critique/` (slug `src-app-app-dashboard`) |
| 2026-10-15 | Impeccable `audit` (dashboard) | 15/20 Good (a11y 3, performance 4, theming 3, responsive 2, integrity 3); P1: row titles and figure badges break at 200% text (WCAG 1.4.4), 20px work-order link (2.5.8); P2: silent Failed-checks truncation, shell landmarks/skip link, dark theme unreachable. Light-mode contrast all ≥ 4.7:1; LCP 360–430 ms, CLS 0, 6 DB requests per render. **Not fixed yet** |
| 2026-10-15 | Dashboard fixes (D-038): unit + targeted E2E | ✅ unit 77/77 (truncation total, red first); dashboard + auth specs 18/18 incl. new skip-link / `aria-current` test and figure-jump focus |
| 2026-10-15 | Confirmation round (desktop 1360, Pixel 7, 320px; normal and 200% text) | ✅ narrowest row title 192–288px at 200% (was 0–27px); no clipped badges; figure grid 5→2→1 columns; no Pixel 7 control under 44px (the 20px work-order link and 18px "assigned to you" are gone); no overflow; no console errors |
| 2026-10-15 | `npm run test:e2e` (after D-038) | ⚠️ 43/44 then ✅ 44/44. The failure was the mobile "a viewer follows inspections" test (not touched by this change); 10/10 in repeats; error output not captured. **Second unexplained intermittent** (see Known gaps) |
| 2026-10-15 | `impeccable detect` (dashboard, app shell, layout) | ✅ `[]` |
| 2026-10-15 | Demo seed (`scripts/demo-seed.mjs`), local end-to-end | ✅ unit 3 (admin never published; password replaced exactly once; refuses an unrecognised seed). Against `db reset --no-seed`: weak password, missing variable (psql exit 3) and re-run refused; 0 output lines contain a password; sign-in via the Auth API: published manager 200 with demo / 400 with local password, admin 400 with demo / 200 with private, other organization 400 with demo; pgTAP 85/85 on the demo-seeded DB. Local seed restored afterwards |
| 2026-10-15 | Hosted Supabase (`lerdmictefgrcmbovlft`): `db push` + `migration list` + `db advisors --linked` | ✅ 8/8 migrations applied, local = remote, advisors "No issues found" |
| 2026-10-15 | Production smoke test (https://aegir-eight.vercel.app) | ✅ 31/31, see DEPLOYMENT.md log (read-only and permission checks; no data created) |
| 2026-10-15 | Security headers (D-039): unit + E2E | ✅ unit 83/83 (+3 header tests); E2E 48/48 twice in a row (+2 tests × 2 projects: headers on `/` and `/login`; no CSP violation across sign-in, dashboard, lists, the raise form and a select popup) |
| 2026-10-15 | Production after the header deploy (`1944fd8`) | ✅ headers live on `/` and `/login`; smoke test 31/31, no console errors |
| 2026-10-12 | Token contrast (OKLCH→sRGB WCAG script) | ✅ all pairs ≥ 4.5:1 text, ring ≥ 3:1; shadcn default destructive-on-tint was 3.99:1 (fixed, D-026) |

## Known gaps

- No Vitest integration tests against the local stack yet (planned with the M3 DAL).
- Accessibility checks (axe via Playwright) are planned for M4.
- pgTAP uses the seed as its fixture (D-018): run `npm run db:reset` before `npm run db:test` after any manual, agent or screenshot clicking in the local app, or seeded-row tests fail on drifted data.
- Two intermittent E2E failures are unexplained (2026-10-15): the dashboard follow-up row not found within 10 s in a slow run, and once the mobile inspections viewer test. Neither reproduced in repeats. Next time one fails, keep the full output and the trace (`test-results/`) before rerunning; M4 should look at test isolation (E2E data accumulates between runs).
- E2E covers authentication, dashboard, vessels, inspections and work orders. Dashboard tests compare figures before and after their own actions instead of asserting global totals (D-030).
- Tests that change state create their own records (seeded work orders and inspections are never moved), so reruns stay valid without a reset.
- Inputs with a `list` (datalist) are exposed as `combobox`, not `textbox`; locate them by that role.
- E2E locator policy under Cache Components: see D-030 (role locators, `visible` filter, scoped to `main`).
- E2E runs leave test vessels and inspections in the local database (no deletes by design); `npm run db:reset` restores the demo data.
