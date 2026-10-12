# Testing

A green build is not evidence of correctness. Tests target **business rules** and **security boundaries** first.

## Layers

| Layer | Tool | Location | What it proves |
|---|---|---|---|
| Unit | Vitest 5 | `src/**/*.test.ts` (colocated) | Pure rules: transitions, Zod schemas, DTO mapping, env validation |
| Database | pgTAP via `supabase test db` | `supabase/tests/*.test.sql` | Constraints, triggers, **RLS per role and organization**, audit immutability |
| Integration | Vitest against the local Supabase stack | `tests/integration/` (⬜) | DAL and Server Action behaviour with real sessions; TS↔DB transition parity |
| End-to-end | Playwright | `e2e/` (⬜) | Critical user flows in a real browser |

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
```

## Priorities

1. RLS isolation and role limits (see [SECURITY.md](SECURITY.md) §7).
2. State-transition rules (DB trigger and TS domain function).
3. Constraint rejections (invalid input reaches the DB and is rejected).
4. Critical E2E flows: sign in → dashboard → create vessel → record inspection with a failure → raise and progress a work order → create and acknowledge a handover → a viewer is blocked from writing.

## pgTAP pattern for RLS

Each test file runs in a transaction and rolls back. Act as a user by setting the JWT claims and role:

```sql
begin;
select plan(2);
-- arrange: fixtures inserted as postgres (bypasses RLS)
set local role authenticated;
set local request.jwt.claims = '{"sub":"<user-uuid>","role":"authenticated"}';
select is((select count(*) from public.vessels where organization_id = '<org-b>'), 0::bigint,
          'Org A member sees no Org B vessels');
select throws_ok($$ update public.vessels set name = 'x' where id = '<org-b-vessel>' $$ ...);
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
| — | `db:test`, E2E | ⬜ not yet applicable (no schema yet) |

## Known gaps

- No database schema yet, so no RLS, integration or E2E tests exist.
- Accessibility checks (axe via Playwright) are planned with E2E.
