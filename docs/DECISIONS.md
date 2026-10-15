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

## D-024 — Impeccable for UI/UX quality, in Operate mode, with opt-in engine and hooks {#d-024}
**Status:** Accepted · 2026-10-12

**Context:** The owner asked for [Impeccable](https://impeccable.style/) (`pbakaus/impeccable`, Apache-2.0) as the project's UI/UX skill. It adds design vocabulary, review commands (`critique`, `audit`, `polish`, `harden`, `clarify`, …) and a design-defaults detector. Its default stance is maximal ("go all out, dream big and bold"). Its launcher downloads a native engine binary into `~/.impeccable`, and `hooks on` installs an edit-time detector hook.
**Decision:**
1. Installed project-locally like the other skills (`.claude/skills/impeccable/`, copies, recorded in `skills-lock.json`).
2. **Aegir's app surfaces are Impeccable's _Operate_ mode** (dashboards, forms, tables): scanability, consistency and native expectations beat expression. The public landing page is the only _Persuade_ surface. `bolder`, `overdrive`, `delight` and `animate` are not used on operational screens unless explicitly requested.
3. **Precedence for UI work:** security and accessibility → [CONVENTIONS.md §6](CONVENTIONS.md#6-ui-shadcnui-tailwind-v4) and the `shadcn` skill (components, semantic tokens, `Field` forms) → Impeccable for UX judgment, hierarchy, copy, states and review. Impeccable never overrides component APIs or introduces raw palette colours.
4. **Engine and hooks are opt-in.** Running `scripts/impeccable` (which may download engine 0.1.14 to `~/.impeccable`, SHA-256-checked) and `impeccable hooks on` (writes `.claude/settings.local.json` and `.impeccable/config.json`) each need the owner's explicit approval, which is then recorded here. Without the engine, the skill reads PRODUCT.md and DESIGN.md directly (its documented fallback).
5. Scope discipline still applies: Impeccable's "complete deliverable" principle does not expand a task beyond its milestone; findings outside scope go into ROADMAP.md.
**Consequences:** Every M3 UI slice ends with an Impeccable `critique` + `audit` pass. Fixes land in the same slice, and the results are noted in TESTING.md.
**Approval recorded (2026-10-12):** the owner approved **engine + hooks**. Engine 0.1.14 was downloaded to `~/.impeccable/bin/0.1.14/` (SHA-256 `abbd69d5…f87c`, matching the published `impeccable-darwin-arm64.sha256`). `impeccable hooks on` wrote `.impeccable/config.json` (committed, shared) and a PostToolUse (Edit|Write) + Stop hook in `.claude/settings.local.json` (machine-local, git-ignored). `live` mode remains opt-in.

## D-025 — One product authority: `docs/PRODUCT.md`; design system in `DESIGN.md` {#d-025}
**Status:** Accepted · 2026-10-12. `impeccable context` resolved `productPath: docs/PRODUCT.md` on its own, so no root `PRODUCT.md` or pointer file exists.

**Context:** Impeccable's `init` writes `PRODUCT.md` at the repo root unless its context resolver finds an existing file. Ours is `docs/PRODUCT.md`, and two product documents would drift.
**Decision (proposed):** `docs/PRODUCT.md` stays the single product authority. When Impeccable needs product context, it reads that file. If the engine insists on a root `PRODUCT.md`, the root file is a short pointer to `docs/PRODUCT.md`, never a second copy. The visual design system is captured once with `impeccable document` as `DESIGN.md` (root, Impeccable's convention; linked from the README and ARCHITECTURE) at the start of M3, generated from the existing shadcn tokens rather than invented.

## D-026 — "The Bridge Console" design system {#d-026}
**Status:** Accepted · 2026-10-12

**Context:** The incumbent theme was stock shadcn "neutral" (fully achromatic) with no semantic colours for the severity, overdue and blocked states the product revolves around. Running `impeccable document` (scan mode), the owner chose: North Star **"The Bridge Console"**, palette **neutral + navy accent + status signals**, density **comfortable-compact**.
**Decision:** Captured in [DESIGN.md](../DESIGN.md) (tokens in `src/app/globals.css`; sidecar `.impeccable/design.json`):
- Primary `oklch(0.37 0.09 252)` "Harbour Navy" (dark: `oklch(0.8 0.07 252)`), cool console sidebar, navy focus ring and chart ramp.
- New semantic tokens `--success`, `--warning`, `--info` (light and dark) plus matching `Badge` variants, following shadcn's own `destructive` 10%-tint pattern.
- Light-theme `--destructive` darkened from `oklch(0.577 0.245 27.325)` to `oklch(0.53 0.21 27)`: shadcn's default measured **3.99:1** against its own tint (fails WCAG AA for small text). The new value measures 4.95:1.
- Every text/background pair was computed with an OKLCH→sRGB contrast script (not estimated); all pass AA.
- Named rules: Signal, Lit Instrument, Two-Channel, Ledger, Fixed Scale, Quiet Hull.
**Consequences:** M3 screens use semantic tokens and badge variants only; colour always means state.

## D-027 — `ButtonLink` for links styled as buttons {#d-027}
**Status:** Accepted · 2026-10-12 (supersedes the `nativeButton={false}` guidance from M2)

**Context:** The vessels E2E suite found "Add vessel" exposed as `button`, not `link`. With `render={<Link />}` and `nativeButton={false}`, Base UI's Button adds `role="button"` to the `<a>`, so assistive technology announces a button that navigates.
**Decision:** `src/components/shared/button-link.tsx`: a real Next `<Link>` styled with shadcn's exported `buttonVariants`. All eight usages were migrated (landing, empty, not-found, forbidden, detail, form).

## D-028 — The vessels list is a watch list {#d-028}
**Status:** Accepted · 2026-10-12 (owner's choice after the Impeccable critique)

**Decision:** The default sort is "Attention first" (`compareByAttention` in `features/vessels/domain.ts`): critical open work, then overdue work and inspections, then blocked, then open-work volume, then name. A–Z, recently updated and newest build year remain one click away. Each row shows an Attention column (critical/overdue/blocked signals). Vessel status badges were neutralised (active → outline, laid up → secondary), so colour means risk (DESIGN.md: The Signal Rule).
**Implementation:** attention counts come from two extra RLS-scoped queries (open work orders; scheduled or in-progress inspections past their date), run in parallel and aggregated in the DAL. Sorting by attention happens in memory, which is fine at fleet scale (tens to hundreds of vessels). Revisit with a SQL view if fleets grow to thousands.

## D-029 — 44px touch targets on coarse pointers only {#d-029}
**Status:** Accepted · 2026-10-12 (owner's choice)

**Context:** The critique's browser pass measured 32px controls (sidebar toggle 28px) on a Pixel 7.
**Decision:** Base components get `pointer-coarse:min-h-11` (44px; icon buttons also `min-w-11`). Desktop keeps 32px (comfortable-compact density). Verified by measurement: every control is 44px under `(pointer: coarse)` and 32px otherwise. Recorded as DESIGN.md's Deck Hand Rule.

## D-030 — E2E locator policy under Cache Components {#d-030}
**Status:** Accepted · 2026-10-12

**Context:** With Cache Components, Next 16 keeps previously visited routes mounted but hidden after client navigation, and streaming can briefly duplicate a resolved boundary. `getByLabel`/`getByText` also match hidden nodes, which caused strict-mode violations (for example, the hidden `/vessels` search box on `/vessels/new`).
**Decision:** E2E uses role locators for controls (which exclude hidden elements) and `.filter({ visible: true })` for text, scoped to `main` where the sidebar could match. Tests that create data use random valid IMO numbers and never assert global totals. Local data from E2E runs is reset with `npm run db:reset` (local only).

## D-031 — Re-check the inspector's role on checklist writes (fix forward) {#d-031}
**Status:** Accepted · 2026-10-15

**Context:** While building the inspections UI, a review of `20261012070235_create_inspections.sql` found that the `inspection_items` update policy let the *assigned* inspector write results without re-checking their role. The assignment is validated when it is made, but a member whose role later changes (for example inspector → viewer) kept write access to that checklist. The `inspections` policy already re-checks the role.
**Decision:** New migration `20261014174645_require_inspector_role_for_item_updates.sql` replaces the policy so the assigned-inspector branch also requires a current `inspector` membership. The applied migration is not edited (fix forward). `supabase/tests/07_inspection_results.test.sql` covers it; run against the old policy (in a rolled-back transaction), its "former inspector" test fails, and it passes with the new one.

## D-032 — How an inspection is conducted {#d-032}
**Status:** Accepted · 2026-10-15

**Decision:**
- **Explicit start.** Results can be recorded only while an inspection is `in_progress`. "Start inspection" is a deliberate, audited step (the transition trigger allows recording on `scheduled` too; the UI does not offer it).
- **One tap for Pass and N/A** (they save immediately). **Fail opens a short form** (finding and severity, both required) and saves only on "Record failure", matching the database's check constraints.
- **Complete** is enabled only when no check is pending; the button explains how many are left. **Cancel** asks for confirmation (`AlertDialog`) because it freezes the checklist.
- **Inspector defaults to the person scheduling** when that person is an inspector (an inspector who left it unassigned could not conduct their own inspection; found by E2E). Managers default to "Assign later".
- **Templates add, never replace.** "Add from template" appends its checks (dropping blank rows) and fills an empty title; typed checks are never discarded.
- **Follow-up is derived, not stored:** a failed check "needs follow-up" until a work order references it (`work_orders.inspection_item_id`). Raising that work order arrives with the work-orders slice.

## D-033 — Shared URL filters; inspection writes revalidate the whole app shell {#d-033}
**Status:** Accepted · 2026-10-15

**Decision:** `src/components/shared/url-filters.tsx` (`useUrlFilters`, `FilterSelect`) replaces the vessels-only copy, so every list keeps its filters in the URL the same way. Inspection mutations call `revalidatePath("/", "layout")` rather than a single path, because inspection state also feeds the vessel watch list, vessel detail and (next) the dashboard. All data is per-request (no `"use cache"`), so this only refreshes the client router cache; there is no server cache to over-invalidate.
