# Architecture Decision Record

Format: context → decision → alternatives → consequences. Status: **Accepted**, **Proposed** or **Superseded by D-xxx**. Never delete an entry; supersede it.

---

## D-001 — Single Next.js app with feature folders, no separate API {#d-001}
**Status:** Accepted · 2026-10-12

**Context:** The MVP needs authenticated CRUD with strict multi-tenant isolation, built by one developer.
**Decision:** One Next.js 16 App Router app in `src/`. `src/app` holds routing only; capabilities live in `src/features/<feature>` with a `server/` Data Access Layer (`server-only`), thin `"use server"` actions, shared Zod `schemas.ts` and pure `domain.ts`. Follows Next.js's "store project files outside of app" strategy plus its Data Access Layer recommendation for new projects.
**Alternatives:** Express/Nest API (extra deploy and auth surface, no benefit at this size); colocating everything in `app/` with `_private` folders (harder to audit data access).
**Consequences:** One deploy target. Data access is auditable per feature. Discipline is needed to keep queries out of pages.

## D-002 — Supabase via `@supabase/ssr`, publishable key only at runtime {#d-002}
**Status:** Accepted · 2026-10-12

**Decision:** Browser and server clients both use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and act as the signed-in user, so RLS always applies. The secret/service-role key is never loaded by app runtime code (seed and test tooling only). Pages and data are protected with `getClaims()`.
**Consequences:** An application bug cannot exceed a user's RLS permissions. Anything privileged must be a carefully reviewed Postgres function.

## D-003 — Supabase CLI pinned as a devDependency {#d-003}
**Status:** Accepted · 2026-10-12

**Context:** The machine's global Homebrew CLI is v2.58.5. The `supabase` skill depends on commands from v2.79+ (`db query`) and v2.81.3+ (`db advisors`).
**Decision:** `supabase@2.120.0` is a pinned devDependency, run via `npx supabase` and npm scripts. The global install is left untouched.
**Consequences:** Reproducible tooling for anyone cloning the repo. No global changes made.

## D-004 — UUID v4 primary keys for entities; identity for audit {#d-004}
**Status:** Accepted · 2026-10-12

**Context / skill conflict:** `supabase-postgres-best-practices` (`schema-primary-keys`) recommends `bigint identity`, or UUIDv7 where IDs are exposed, and warns that random UUIDv4 fragments indexes **on large tables**. Postgres 17 (our version) has no native `uuidv7()`; that arrives in PG 18.
**Decision:** Entity tables use `uuid default gen_random_uuid()`. `audit_events`, which is append-only and the highest-volume table, uses `bigint generated always as identity`.
**Rationale:** Entity IDs appear in URLs (`/vessels/<id>`), so non-enumerable IDs avoid leaking record counts. They match `auth.users.id` (uuid). Expected volumes (thousands of rows) make fragmentation irrelevant. Avoids a non-default extension.
**Revisit when:** the project moves to Postgres 18 (switch the default to `uuidv7()` in a forward migration), or any entity table exceeds about 10M rows.

## D-005 — Postgres enums for domain states {#d-005}
**Status:** Accepted · 2026-10-12

**Context:** The skill allows either `text` + `check` or an enum type.
**Decision:** Use `create type ... as enum` for statuses, roles and severities.
**Rationale:** `supabase gen types` turns enums into TypeScript union types, so the app's types follow the database. Adding a value is a simple forward migration (`alter type ... add value`).
**Trade-off:** Removing or renaming a value requires a type swap migration. Accepted, because these state sets are stable.

## D-006 — State transitions enforced in the database, mirrored in TypeScript {#d-006}
**Status:** Accepted · 2026-10-12

**Decision:** Allowed transitions (work orders, inspections, handovers) are enforced by `before update` triggers (authoritative). The same table lives in `features/*/domain.ts` for UX: showing only valid actions and validating early. Both are tested: pgTAP for the trigger, Vitest for the domain function.
**Consequence:** Two copies of the rule. A drift test (TS table vs DB behaviour) is planned in the integration suite.

## D-007 — Cache Components on; no server caching of organization data {#d-007}
**Status:** Accepted · 2026-10-12

**Context:** `create-next-app@16.4.0` enables `cacheComponents` and `partialPrefetching`. Every Aegir page except the landing page depends on the user's session and RLS.
**Decision:** Keep Cache Components enabled (current framework default). Session reads sit inside `<Suspense>` boundaries; layouts stay static shells. **No `"use cache"` on organization data** in the MVP: queries run per request through the user-scoped client, deduplicated with `React.cache()`.
**Alternatives:** Disable `cacheComponents` (simpler mental model, loses static shell and prefetching); `use cache: private` (adds complexity for little gain at MVP scale).
**Fallback:** If Cache Components blocks delivery, a route may set `export const instant = false`. Disabling the flag globally is a recorded decision, not a silent change.

## D-008 — Hand-authored imperative migrations validated locally {#d-008}
**Status:** Accepted · 2026-10-12

**Context / skill conflict:** The `supabase` skill suggests iterating with `supabase db query` and generating migrations with `supabase db pull`. The project brief requires hand-authored, reviewable, timestamped migrations created with `supabase migration new`.
**Decision:** Create files with `npx supabase migration new <name>` and write SQL by hand. Validate with `db reset` (**local stack only**), `db lint`, `db advisors` and `test db`. `db query` may be used for local experiments, but the committed file is always reviewed and complete. Declarative schemas (`supabase/schemas/`) are not used.
**Consequence:** Migrations read as intentional design. `db reset` is never pointed at a linked or remote project.

## D-009 — Explicit Data API grants in every table migration {#d-009}
**Status:** Accepted · 2026-10-12

**Context:** Supabase changelog, 2026-04-28: new tables are no longer automatically exposed to the Data and GraphQL APIs (enforced on all projects from 2026-10-30).
**Decision:** Each table migration includes `grant select[, insert, update] ... to authenticated` matching its policies, enables RLS, and grants nothing to `anon`. No `delete` grants on safety records.

## D-010 — RLS helper functions in a `private` schema {#d-010}
**Status:** Accepted · 2026-10-12

**Decision:** `private.is_org_member()` and `private.has_org_role()` are `security definer`, `stable`, `set search_path = ''`, check `(select auth.uid())`, have execute revoked from `public`/`anon`, and are called in policies wrapped in `(select ...)` for per-statement caching. This follows the patterns in both Supabase skills (`security-rls-performance` and the `supabase` security checklist).
**Note on `force row level security`:** The postgres skill shows `force row level security`. We do not force it. App traffic uses the `authenticated` role, which is always subject to RLS. `force` only adds policy checks for the table owner, and that is the role our reviewed security-definer helpers and audit trigger run as. Forcing would need extra owner policies without improving isolation for app users. Revisit this if a non-owner privileged role is ever introduced.

## D-011 — Demo access strategy {#d-011}
**Status:** Accepted · 2026-10-12, option (a)

**Options:**
(a) Seeded demo accounts per role in a single demo organization, with credentials published in the README; no hard deletes are possible, and a documented reset script restores the seed.
(b) A "Try the demo" button that signs into a shared **non-admin** account.
**Decision:** (a). Locally, `supabase/seed.sql` creates one user per role in "Northwind Shipping" plus a second organization ("Meridian Tankers") that exists to prove isolation. For the hosted demo (M5), publish manager, inspector, technician and viewer logins with a demo-only password, and never publish the admin login. **Constraint:** never publish a privileged account, never bypass RLS for the demo. Sign-out is session-local (D-020), so visitors sharing a demo login don't sign each other out.

## D-012 — shadcn/ui with Base UI primitives (`base-nova`) {#d-012}
**Status:** Accepted · 2026-10-12

**Decision:** `shadcn@4.21.4 init --base base --preset nova`. Base UI is the current shadcn default. Custom triggers use the `render` prop (not Radix `asChild`). The CLI is pinned instead of `@latest` for reproducibility. The added `cn` package was verified as shadcn-maintained (`shadcn-ui/cn`).

## D-013 — Dependency pinning and Node version {#d-013}
**Status:** Accepted · 2026-10-12

**Decision:** `.npmrc` sets `save-exact=true` and `engine-strict=true`. All dependency versions are exact. Node ≥ 22 (`.nvmrc` = 24), because supabase-js dropped Node 20. `@types/node` is aligned to 24 (the scaffold shipped 20, which conflicted with Vitest 5's peer range).

## D-014 — Skill-supplied commands are reviewed, not auto-run {#d-014}
**Status:** Accepted · 2026-10-12

**Context:** The `shadcn` skill embeds `` !`npx shadcn@latest info --json` `` (runs on load) and pre-approves `npx shadcn@latest *`. `@latest` is unpinned.
**Decision:** Accepted for the read-only `info` call. For any state-changing shadcn command, use the pinned `shadcn@4.21.4` and review the diff. Never run `--overwrite` without approval. The skill's `scripts/showcase-coverage.mjs` was reviewed: it is a read-only file scanner.

## D-015 — Local auth hardening {#d-015}
**Status:** Accepted · 2026-10-12

**Decision:** `supabase/config.toml`: public sign-up disabled (`[auth] enable_signup = false`), minimum password length 10, `letters_digits` required. Users are provisioned into organizations. Mirror these settings on the hosted project during deployment.
**Correction (2026-10-12, M2):** M1 also set `[auth.email] enable_signup = false`. In GoTrue that flag disables the **entire email provider**, so password logins failed (`email_provider_disabled`). It is now `true`, with a comment explaining why. Sign-ups remain disabled by the global flag (verified: `signup_disabled`).

## D-016 — RLS helpers return sets; policies use `in (select …)` {#d-016}
**Status:** Accepted · 2026-10-12

**Context / skill nuance:** The postgres skill's example wraps a boolean helper as `(select private.is_team_member(team_id))`. Because that call passes the row's column, it is a *correlated* subquery and still runs once per row.
**Decision:** Helpers return the caller's organization IDs (`private.my_org_ids()`, `private.my_org_ids_with_role(roles)`), and policies use `organization_id in (select private.my_org_ids())`. The subquery is uncorrelated, so Postgres evaluates it once per statement and hashes the result. `(select auth.uid())` is still wrapped everywhere.
**Consequence:** One pattern for every table; fast with indexes on `organization_id`.

## D-017 — Column-level grants for immutable and server-owned columns {#d-017}
**Status:** Accepted · 2026-10-12

**Decision:** Instead of table-wide `INSERT`/`UPDATE`, each table grants only the client-writable columns ([DATA_MODEL.md §5a](DATA_MODEL.md#5a-privileges-column-level-grants)). Ownership (`organization_id`), authorship (`created_by`, `from_user_id`), lifecycle timestamps and IDs are therefore impossible to forge or change, without needing extra trigger code. Server-owned values are set by triggers (`private.set_created_by()` and friends).
**Trade-off:** Adding a client-editable column requires a grant in the same migration. A forgotten grant fails loudly (42501) rather than silently.

## D-018 — Seed data doubles as the pgTAP fixture contract {#d-018}
**Status:** Accepted · 2026-10-12

**Decision:** `supabase/seed.sql` uses fixed, readable UUIDs (`a…` Northwind, `b…` Meridian) documented at the top of the file. pgTAP tests reference them, create any extra rows they need, and roll back. This keeps tests short and readable.
**Trade-off:** Changing those fixture rows means updating tests. The contract is listed in the seed header.

## D-019 — One organization per session in the MVP {#d-019}
**Status:** Accepted · 2026-10-12

**Decision:** The schema supports many memberships per user, and RLS handles all of them. The UI uses the user's oldest membership (`getSessionState()` in `src/lib/auth/session.ts`). An organization switcher is future work. Users without a membership land on `/no-access`.

## D-020 — Session-local sign-out {#d-020}
**Status:** Accepted · 2026-10-12

**Context:** `supabase.auth.signOut()` defaults to `scope: "global"`, which revokes every session of the user. The E2E suite exposed this: one test signing out logged out parallel tests using the same account. On a shared demo login it would log out every visitor.
**Decision:** `signOut({ scope: "local" })`.

## D-021 — Playwright introduced in M2; serial locally {#d-021}
**Status:** Accepted · 2026-10-12

**Decision:** Playwright (`e2e/`, desktop and mobile projects) was added in M2 instead of M4, to verify the real sign-in flow (Server Actions, cookies, proxy). It runs against a production build and the local Supabase stack. Locally it runs with **1 worker** and a 10 s `expect` timeout: on an 8 GB laptop the full Supabase stack plus parallel browsers caused 10 s Auth→DB connection timeouts (diagnosed: Auth handled 5 concurrent sign-ins in 0.4 s when the machine was not saturated). CI uses 2 workers.

## D-022 — Revoke Supabase's legacy default privileges {#d-022}
**Status:** Accepted · 2026-10-12

**Context:** Inspecting `pg_default_acl` on the local stack showed that new `public` tables, sequences and functions still get `ALL`/`EXECUTE` for `anon` and `authenticated` by default.
**Decision:** The first migration runs `alter default privileges for role postgres in schema public revoke …` for tables, sequences and functions, so new objects are private until a migration grants access. Each table migration also revokes explicitly before granting, so the result is identical on projects with either default.

## D-023 — Generated types formatted with Prettier {#d-023}
**Status:** Accepted · 2026-10-12

**Decision:** `npm run db:types` pipes `supabase gen types` through `prettier` (pinned devDependency) because the CLI emits unformatted TypeScript. Prettier is used only for this generated file; source formatting follows the existing style.
