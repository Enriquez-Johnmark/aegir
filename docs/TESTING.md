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
| 2026-10-12 | Token contrast (OKLCH→sRGB WCAG script) | ✅ all pairs ≥ 4.5:1 text, ring ≥ 3:1; shadcn default destructive-on-tint was 3.99:1 (fixed, D-026) |

## Known gaps

- No Vitest integration tests against the local stack yet (planned with the M3 DAL).
- Accessibility checks (axe via Playwright) are planned for M4.
- E2E covers authentication, vessels and inspections; work orders and the dashboard are added with their slices.
- Inputs with a `list` (datalist) are exposed as `combobox`, not `textbox`; locate them by that role.
- E2E locator policy under Cache Components: see D-030 (role locators, `visible` filter, scoped to `main`).
- E2E runs leave test vessels and inspections in the local database (no deletes by design); `npm run db:reset` restores the demo data.
