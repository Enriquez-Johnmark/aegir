# Security Model

> **Status:** the session handling foundation is implemented. RLS policies and their tests are **designed, not yet implemented** (milestone M2). Test results will be recorded in §8 as they run. Do not claim a control is in place until §8 shows a passing test.

Aegir is a portfolio demonstration using synthetic data. It is **not** a certified maritime safety system.

## 1. Authentication

- Supabase Auth, email and password. **Public sign-up is disabled** (`supabase/config.toml`: `[auth] enable_signup = false`, `[auth.email] enable_signup = false`). Users are provisioned into an organization.
- Password policy (local config): minimum 10 characters, letters and digits. Mirror this on the hosted project.
- Sessions are stored in cookies via `@supabase/ssr`. `src/proxy.ts` refreshes them on every request with `supabase.auth.getClaims()`.
- Server code protects pages and data with **`getClaims()`**, which validates the JWT. **`getSession()` is never trusted on the server.**
- The proxy is **not** an authorization boundary. Every page, Server Action and DAL function re-verifies the user, and RLS verifies again in the database.

## 2. Authorization: organizations and roles

A user's roles live in `public.memberships (organization_id, user_id, role)`. **Never in JWT `user_metadata`**, which users can edit.

| Capability | admin | manager | inspector | technician | viewer |
|---|:-:|:-:|:-:|:-:|:-:|
| Read all organization data (vessels, inspections, work orders, handovers, audit) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create and edit vessels | ✓ | ✓ | | | |
| Create inspections | ✓ | ✓ | ✓ | | |
| Record results / complete an inspection | ✓ | ✓ | assigned inspector | | |
| Create work orders (incl. from failed checks) | ✓ | ✓ | ✓ | | |
| Edit any work-order field / reassign | ✓ | ✓ | | | |
| Change status of a work order assigned to me | ✓ | ✓ | ✓ | ✓ | |
| Create a handover (as `from_user`) | ✓ | ✓ | ✓ | ✓ | |
| Acknowledge a handover addressed to me | ✓ | ✓ | ✓ | ✓ | |
| Delete any safety record | ✗ | ✗ | ✗ | ✗ | ✗ |
| Modify audit events | ✗ | ✗ | ✗ | ✗ | ✗ |

Membership management is seed-only in the MVP (no UI).

## 3. Row-Level Security design

- RLS is **enabled on every table in `public`**, in the migration that creates it. Explicit `GRANT`s go to `authenticated` only (Supabase no longer auto-exposes new tables to the Data API). **`anon` gets no grants on organization data.**
- Membership helper functions (planned):

  ```sql
  -- private schema: not exposed by the Data API
  private.is_org_member(org_id uuid) returns boolean
  private.has_org_role(org_id uuid, roles public.org_role[]) returns boolean
  -- security definer, stable, set search_path = '', checks (select auth.uid()),
  -- execute revoked from public/anon, granted to authenticated
  ```
  They are `security definer` only so that policies on `memberships` don't recurse. They return a boolean about the **calling** user and nothing else.
- Policy pattern (example):

  ```sql
  create policy "vessels: select members" on public.vessels
    for select to authenticated
    using ((select private.is_org_member(organization_id)));

  create policy "vessels: update managers" on public.vessels
    for update to authenticated
    using ((select private.has_org_role(organization_id, array['admin','manager']::public.org_role[])))
    with check ((select private.has_org_role(organization_id, array['admin','manager']::public.org_role[])));
  ```
- Column-level rules that RLS can't express (for example, a technician may change only `status` and `blocked_reason` on their own work orders) are enforced in `before update` triggers, which raise `P0001` with a clear message.
- **Forgery prevention:**
  - `created_by` and `from_user_id` are checked with `with check (... = (select auth.uid()))` or set by trigger.
  - `organization_id` on child rows must match the parent (composite FKs) **and** the caller's membership (RLS `with check`).
  - `audit_events.actor_id` is taken from `auth.uid()` inside a security-definer trigger. Clients cannot insert audit rows.

## 4. Secrets

| Secret | Where it may live | Never |
|---|---|---|
| Publishable key + URL | `NEXT_PUBLIC_*` env (Vercel, `.env.local`) | n/a (browser-safe by design; RLS protects data) |
| Secret / service-role key | Local shell for seed and test scripts; CI secret store | App runtime, any `NEXT_PUBLIC_*` var, git, logs, chat |
| DB password, access tokens | Developer password manager, CI secret store | git, docs, chat |

- `.env*` is git-ignored except `.env.example`, which contains placeholders only.
- Use **scoped** Supabase personal access tokens for CLI and CI, not the full-account browser-login token.
- The local stack's printed keys are well-known development defaults. They are still kept out of git.

## 5. Audit integrity

- Audit rows are written only by triggers. App roles have no INSERT, UPDATE or DELETE privilege or policy on `audit_events`.
- Audit payloads store **changed business columns only**. Never credentials, tokens or auth metadata.

## 6. Application-layer controls

- Server Actions are public endpoints. Each one re-verifies the session, validates input with Zod, derives identity server-side and returns minimal results ([CONVENTIONS.md §2](CONVENTIONS.md#server-actions)).
- Route params (`[vesselId]`) are validated as UUIDs before querying.
- Next.js checks the Origin header on Server Actions (CSRF). Mutations are never performed on GET.

## 7. Required security tests (planned: `supabase/tests/*.test.sql`, pgTAP)

1. Anonymous: zero rows or a permission error on every organization table.
2. Member of Org A: can read Org A rows; **sees zero Org B rows**.
3. Member of Org A cannot insert, update or link rows into Org B (including by passing Org B's `organization_id` or a parent id).
4. Role limits: viewer can't write; technician can't edit vessels or other users' work orders; inspector can't edit vessels.
5. Invalid state transitions are rejected (work orders, inspections, handovers).
6. Audit: no role can insert, update or delete `audit_events`; `actor_id` matches the acting user.
7. Constraint violations: missing required fields, bad IMO number, failed item without severity, and so on.
8. `supabase db advisors` reports no security findings.

## 8. Test results log

| Date | Suite | Result | Notes |
|---|---|---|---|
| — | — | — | No RLS tests yet (no tables). |

## 9. Known risks and limitations

- **Dev-only advisory:** `npm audit` reports 5 high-severity advisories, all through `braces` in `eslint-config-next`'s lint toolchain (development only, not shipped to users). The suggested `--force` fix downgrades to Next 14's config, so it is not applied. Re-check when `eslint-config-next` updates.
- Demo access design is pending ([DECISIONS.md D-011](DECISIONS.md#d-011)).
- JWT claims refresh only on token refresh. Role changes take effect at the latest after `jwt_expiry` (3600 s). Roles are read from the table, not the JWT, so this mainly affects session validity, not role checks.
