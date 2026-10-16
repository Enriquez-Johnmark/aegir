# Security Model

> **Status (2026-10-16):** authentication, organization roles, RLS on every table, column-level grants, transition/immutability triggers and the audit log are **implemented and tested** (135 pgTAP tests in 12 files; 76 Playwright tests including auth, role limits, cross-organization not-found and axe). An independent review on 2026-10-16 found no Critical or High security issues; its fixes are in D-043. Evidence: §8. Do not claim a control is in place until §8 shows a passing test.

Aegir is a portfolio demonstration using synthetic data. It is **not** a certified maritime safety system.

## 1. Authentication

- Supabase Auth, email and password. **Public sign-up is disabled** with `[auth] enable_signup = false` in `supabase/config.toml` (verified: `/auth/v1/signup` returns `signup_disabled`). Note: `[auth.email] enable_signup` must stay `true`, because in GoTrue it switches the whole email provider (password logins) off. Users are provisioned into an organization.
- Password policy (local config): minimum 10 characters, letters and digits. Mirror this on the hosted project.
- Sessions are stored in `httpOnly` cookies via `@supabase/ssr` (`Secure` on Vercel; `src/lib/supabase/cookie-options.ts`, D-043): only the server reads them, so scripts never see the refresh token. `src/proxy.ts` refreshes them on every request with `supabase.auth.getClaims()`.
- Server code protects pages and data with **`getClaims()`**, which validates the JWT. **`getSession()` is never trusted on the server.**
- The proxy is **not** an authorization boundary. It only redirects optimistically (signed out → `/login?next=…`, signed in → away from `/login`). Every page, Server Action and DAL function re-verifies the user (`requireUser()` in `src/lib/auth/session.ts`), and RLS verifies again in the database.
- `next` redirect targets are sanitised (`src/lib/safe-redirect.ts`), so off-site URLs fall back to `/dashboard` (open-redirect protection, unit- and E2E-tested). The normalised path is checked too, so dot segments can't turn `/..//evil.com` into `//evil.com` (D-043).
- Sign-in errors are generic ("Invalid email or password.") to prevent account enumeration; Supabase's rate-limit error is surfaced as "Too many sign-in attempts".
- **Sign-out uses `scope: "local"`**: it ends only the current browser session. The default global scope would sign the same account out everywhere, which would break shared demo logins (found by the E2E suite).

## 2. Authorization: organizations and roles

A user's roles live in `public.memberships (organization_id, user_id, role)`. **Never in JWT `user_metadata`**, which users can edit.

| Capability | admin | manager | inspector | technician | viewer |
|---|:-:|:-:|:-:|:-:|:-:|
| Read all organization data (vessels, inspections, work orders, handovers, audit) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create and edit vessels | ✓ | ✓ | | | |
| Create inspections | ✓ | ✓ | ✓ | | |
| Add checks to an inspection | ✓ | ✓ | assigned inspector, or creator while scheduled (D-043) | | |
| Record results / complete an inspection | ✓ | ✓ | assigned inspector (role re-checked, D-031) | | |
| Create work orders (incl. from failed checks) | ✓ | ✓ | ✓ | | |
| Edit any work-order field / reassign | ✓ | ✓ | | | |
| Change status of a work order assigned to me | ✓ | ✓ | ✓ | ✓ | |
| Create a handover (as `from_user`) | ✓ | ✓ | ✓ | ✓ | |
| Acknowledge a handover addressed to me (role re-checked, D-043) | ✓ | ✓ | ✓ | ✓ | |
| Delete any safety record | ✗ | ✗ | ✗ | ✗ | ✗ |
| Modify audit events | ✗ | ✗ | ✗ | ✗ | ✗ |

Membership management is seed-only in the MVP (no UI).

## 3. Row-Level Security design

- RLS is **enabled on every table in `public`**, in the migration that creates it. Explicit `GRANT`s go to `authenticated` only (Supabase no longer auto-exposes new tables to the Data API). **`anon` gets no grants on organization data.**
- **Default privileges hardened:** the Supabase image still grants ALL on new `public` objects to `anon`/`authenticated`. The first migration revokes those defaults, and each table then grants only what its policies need (D-009, D-022).
- Membership helper functions (implemented in `private`, which the Data API does not expose):

  ```sql
  private.my_org_ids() returns setof uuid                          -- orgs the caller belongs to
  private.my_org_ids_with_role(roles org_role[]) returns setof uuid -- ... with one of these roles
  private.my_colleague_ids() returns setof uuid                     -- users sharing an org with the caller
  private.assert_member_with_role(org, user, roles, label)          -- trigger validation of assignees etc.
  -- security definer, stable, set search_path = '', based on (select auth.uid()),
  -- execute revoked from public, granted to authenticated
  ```
  They are `security definer` only so that policies on `memberships` don't recurse, and they answer questions about the **calling** user only. `assert_member_with_role` first refuses callers outside the organization, so it cannot be used to probe another organization's members.
- Policy pattern (uncorrelated subquery, evaluated once per statement; see D-016):

  ```sql
  create policy "vessels: select members" on public.vessels
    for select to authenticated
    using (organization_id in (select private.my_org_ids()));

  create policy "vessels: update managers" on public.vessels
    for update to authenticated
    using (organization_id in (select private.my_org_ids_with_role(array['admin','manager']::public.org_role[])))
    with check (organization_id in (select private.my_org_ids_with_role(array['admin','manager']::public.org_role[])));
  ```
- **Column-level grants** decide which columns clients may write at all ([DATA_MODEL.md §5a](DATA_MODEL.md#5a-privileges-column-level-grants)): `organization_id`, `created_by`, `from_user_id`, `completed_at`, `acknowledged_at` and IDs can never be set or changed by clients.
- Column-level rules that RLS can't express (for example, a technician may change only `status` and `blocked_reason` on their own work orders) are enforced in `before update` triggers, which raise `P0001` with a clear message.
- **Forgery prevention:**
  - `created_by` and `from_user_id` are checked with `with check (... = (select auth.uid()))` or set by trigger.
  - `organization_id` on child rows must match the parent (composite FKs) **and** the caller's membership (RLS `with check`).
  - `audit_events.actor_id` is taken from `auth.uid()` inside a security-definer trigger. Clients cannot insert audit rows.

## 4. Secrets

| Secret | Where it may live | Never |
|---|---|---|
| Publishable key + URL | `NEXT_PUBLIC_*` env (Vercel, `.env.local`) | n/a (browser-safe by design; RLS protects data) |
| Secret / service-role key | Local shell for seed and test scripts (a CI secret store if CI is added) | App runtime, any `NEXT_PUBLIC_*` var, git, logs, chat |
| DB password, access tokens | Developer password manager (a CI secret store if CI is added) | git, docs, chat |

- `.env*` is git-ignored except `.env.example`, which contains placeholders only.
- Use **scoped** Supabase personal access tokens for the CLI (and CI, if added), not the full-account browser-login token. There is no CI pipeline yet.
- The local stack's printed keys are well-known development defaults. They are still kept out of git.

## 5. Audit integrity

- Audit rows are written only by triggers. App roles have no INSERT, UPDATE or DELETE privilege or policy on `audit_events`.
- Inserts, updates and (since D-043) deletes are recorded on all six audited tables, so removing a membership, which withdraws access, leaves a trace.
- Audit payloads store **changed business columns only**. Never credentials, tokens or auth metadata.

## 6. Application-layer controls

- Server Actions are public endpoints. Each one re-verifies the session, validates input with Zod, derives identity server-side and returns minimal results ([CONVENTIONS.md §2](CONVENTIONS.md#server-actions)).
- Route params (`[vesselId]`) are validated as UUIDs before querying. Bound Server Action arguments (`updateVesselAction.bind(null, vesselId)`) travel through the client, so they are re-validated in the action.
- List search text is sanitised before use in a PostgREST `.or()` filter, so URL input cannot inject extra filter clauses (unit-tested in `vessels.test.ts`).
- Vessel writes take `organization_id` from the session, never from the form; a 23505 duplicate-IMO error maps to a field message, and 42501 maps to a permission message.
- Next.js checks the Origin header on Server Actions (CSRF). Mutations are never performed on GET.
- **HTTP security headers on every response** (`src/lib/security-headers.ts`, applied in `next.config.ts`, D-039): Content-Security-Policy (`default-src 'self'`, `connect-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`, `upgrade-insecure-requests` on Vercel), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, a restrictive `Permissions-Policy` and `Cross-Origin-Opener-Policy: same-origin`. Vercel adds HSTS. The browser never calls Supabase directly, so no third-party origin is allowed at all.

## 7. Required security tests (`supabase/tests/*.test.sql`, pgTAP; all implemented)

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
| 2026-10-12 | `npx supabase test db` (6 files) | ✅ 73/73 | Tenancy (14), vessels (13), inspections (16), work orders (14), handovers (9), audit (7) |
| 2026-10-12 | `npx supabase db advisors --type security` | ✅ no findings | Performance advisor: only "unused index" (fresh DB) |
| 2026-10-12 | `npx supabase db lint` | ✅ no errors | plpgsql_check |
| 2026-10-12 | Manual API probe (curl) | ✅ | Technician sees only Northwind vessels; vessel insert → 42501 RLS; Meridian manager reading a Northwind vessel → `[]`; anon → 42501; signup → `signup_disabled` |
| 2026-10-12 | `npx playwright test` (auth) | ✅ 10/10 | Desktop + mobile: redirect to login, generic error, server validation, open-redirect guard, sign-out |
| 2026-10-15 | `npx supabase test db` (7 files) | ✅ 78/78 | + `07_inspection_results` (5): assigned inspector may record, others may not, manager may, a demoted inspector may not (D-031). The new test was run once against the old policy in a rolled-back transaction: test 4 failed as expected |
| 2026-10-15 | `npx supabase test db` (8 files) | ✅ 85/85 | + `08_linked_failed_checks` (7): a failed check with a work order can't become pass or N/A, for the inspector or a manager; its finding can be refined; an unlinked failure can still be corrected (D-037). Red against the old schema first (5/7 failed) |
| 2026-10-15 | `npx supabase test db` (9 files) | ✅ 90/90 | + `09_handover_access` (5): viewer can't send; another organization sees none of ours, can't write into ours, can't point at our vessel; the sender can't acknowledge their own handover |
| 2026-10-15 | `npx supabase test db` (10 files) | ✅ 96/96 | + `10_audit_log_access` (6): a viewer reads exactly the organization's log (all six record types), resolves every actor's name, can't delete events; another organization can't resolve our actors' names; events of one transaction share a timestamp (the log's paging tie-break, D-042) |
| 2026-10-15 | `npx supabase db advisors --linked` (hosted, after the first `db push`) | ✅ no issues | First run against the hosted project; schema identical to local (8/8 migrations) |
| 2026-10-16 | Independent review (security, database, tests, docs; read-only reviewers) | ✅ no Critical/High security findings | Probed locally in rolled-back transactions: cross-organization reads/writes/FK tricks blocked, grants and definer functions as documented, Server Actions validate and re-verify, no secrets in 132 commits. Confirmed and fixed in D-043: frozen records blocked user deletion; any inspector could add checks anywhere; two races; demoted recipients could acknowledge; deletes unaudited; protocol-relative redirect after normalisation; readable session cookies |
| 2026-10-16 | `npx supabase test db --local` (12 files) | ✅ 135/135 | + `11_review_hardening` (11; 6 red against the schema before the migration: user deletion ×3, membership removal audited, inspector can't add to another's inspection, demoted recipient can't acknowledge) + `12_read_isolation` (28: each organization sees its own rows and none of the other's, on vessels, inspections, inspection_items, work_orders, handovers, audit_events, memberships). Races: both two-session reproductions went through before and wait on the new lock after |
| 2026-10-16 | `npx supabase db lint --local` / `db advisors --local` | ✅ no errors / no issues | After `20261016000517_harden_after_independent_review` |
| 2026-10-16 | `npx supabase db advisors --linked` (hosted, after pushing migration 9) | ⚠️ 1 WARN, no database findings | `auth_leaked_password_protection`: an Auth setting, not schema; see §9 |

Covered by pgTAP (highlights): RLS enabled on every public table; anon has zero privileges; no private function executable by anon; every security-definer function pins `search_path`; cross-organization reads return nothing (table by table, with positive controls, `12_read_isolation`); cross-organization inserts/moves rejected; forged `created_by`/`from_user_id` rejected; role limits per table; invalid transitions rejected; closed inspections and acknowledged handovers frozen; audit rows unwritable by clients and stamped with the real actor.

## 9. Known risks and limitations

- **CSP allows inline scripts and styles** (`'unsafe-inline'`). Nonce-based CSP is incompatible with the prerendered static shells Aegir uses (Partial Prerendering), and Next's streamed React payload is inline script. The remaining protection against script injection is React's output escaping and the absence of `dangerouslySetInnerHTML`; every other directive is strict (D-039). Revisit if Next supports nonces or hashes for prerendered shells.

- **Tooling-only advisory:** `npm audit` reports high-severity entries for one advisory: `braces` stack exhaustion on deeply nested glob patterns (GHSA-vfj7-8cjw-p6xm), reached through `fast-glob`/`micromatch` in `eslint-config-next` (lint) and in the `shadcn` CLI package. Both are dev dependencies since 2026-10-16 (`shadcn` moved, D-043), and `npm audit --omit=dev` reports **0 vulnerabilities**. The app imports only `shadcn/tailwind.css` at build time; the vulnerable glob code never runs in the app or on the server. The suggested `--force` fix downgrades `eslint-config-next` to Next 14's config, so it is not applied. Re-check when either package updates.
- **Leaked-password protection is off** on the hosted project (the advisor's `auth_leaked_password_protection` warning). Supabase offers the HaveIBeenPwned check on the Pro plan and above. The demo's exposure is small: public signups are disabled, so every password is set by the seed; the demo password is published on purpose; the admin password is random and unrecorded. Turn it on (Auth → Providers → Email) if the project moves to Pro or takes real signups.
- Demo access: seeded non-admin accounts (D-011). Locally every seeded user shares the password in `supabase/seed.sql`; the hosted demo must use different passwords and must not publish the admin account.
- **Sign-in rate limiting is shared by all visitors.** Sign-in runs in a Server Action, so Supabase Auth sees Vercel's egress IPs, not the visitor's: about 30 bad attempts in 5 minutes could lock everyone out of the shared demo for a while. There is no app-level limit. Mitigation (not applied, owner's choice): a Vercel Firewall rate-limit rule on the login POST, or a CAPTCHA.
- **The shared demo can be defaced** with the published logins (records can't be deleted by design). Recovery: `scripts/demo-reset.mjs` restores the seed (destructive; DEPLOYMENT.md). Users can still edit their own display name (`profiles.full_name`), which isn't audited.
- JWT claims refresh only on token refresh. Role changes take effect at the latest after `jwt_expiry` (3600 s). Roles are read from the table, not the JWT, so this mainly affects session validity, not role checks.
