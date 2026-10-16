# Architecture Decision Record

Format: context → decision → alternatives → consequences. Status: **Accepted**, **Proposed** or **Superseded by D-xxx**. Never delete an entry; supersede it.

---

<a id="d-001"></a>

## D-001 — Single Next.js app with feature folders, no separate API
**Status:** Accepted · 2026-10-12

**Context:** The MVP needs authenticated CRUD with strict multi-tenant isolation, built by one developer.
**Decision:** One Next.js 16 App Router app in `src/`. `src/app` holds routing only; capabilities live in `src/features/<feature>` with a `server/` Data Access Layer (`server-only`), thin `"use server"` actions, shared Zod `schemas.ts` and pure `domain.ts`. Follows Next.js's "store project files outside of app" strategy plus its Data Access Layer recommendation for new projects.
**Alternatives:** Express/Nest API (extra deploy and auth surface, no benefit at this size); colocating everything in `app/` with `_private` folders (harder to audit data access).
**Consequences:** One deploy target. Data access is auditable per feature. Discipline is needed to keep queries out of pages.

<a id="d-002"></a>

## D-002 — Supabase via `@supabase/ssr`, publishable key only at runtime
**Status:** Accepted · 2026-10-12

**Decision:** Browser and server clients both use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and act as the signed-in user, so RLS always applies. The secret/service-role key is never loaded by app runtime code (seed and test tooling only). Pages and data are protected with `getClaims()`.
**Consequences:** An application bug cannot exceed a user's RLS permissions. Anything privileged must be a carefully reviewed Postgres function.

<a id="d-003"></a>

## D-003 — Supabase CLI pinned as a devDependency
**Status:** Accepted · 2026-10-12

**Context:** The machine's global Homebrew CLI is v2.58.5. The `supabase` skill depends on commands from v2.79+ (`db query`) and v2.81.3+ (`db advisors`).
**Decision:** `supabase@2.120.0` is a pinned devDependency, run via `npx supabase` and npm scripts. The global install is left untouched.
**Consequences:** Reproducible tooling for anyone cloning the repo. No global changes made.

<a id="d-004"></a>

## D-004 — UUID v4 primary keys for entities; identity for audit
**Status:** Accepted · 2026-10-12

**Context / skill conflict:** `supabase-postgres-best-practices` (`schema-primary-keys`) recommends `bigint identity`, or UUIDv7 where IDs are exposed, and warns that random UUIDv4 fragments indexes **on large tables**. Postgres 17 (our version) has no native `uuidv7()`; that arrives in PG 18.
**Decision:** Entity tables use `uuid default gen_random_uuid()`. `audit_events`, which is append-only and the highest-volume table, uses `bigint generated always as identity`.
**Rationale:** Entity IDs appear in URLs (`/vessels/<id>`), so non-enumerable IDs avoid leaking record counts. They match `auth.users.id` (uuid). Expected volumes (thousands of rows) make fragmentation irrelevant. Avoids a non-default extension.
**Revisit when:** the project moves to Postgres 18 (switch the default to `uuidv7()` in a forward migration), or any entity table exceeds about 10M rows.

<a id="d-005"></a>

## D-005 — Postgres enums for domain states
**Status:** Accepted · 2026-10-12

**Context:** The skill allows either `text` + `check` or an enum type.
**Decision:** Use `create type ... as enum` for statuses, roles and severities.
**Rationale:** `supabase gen types` turns enums into TypeScript union types, so the app's types follow the database. Adding a value is a simple forward migration (`alter type ... add value`).
**Trade-off:** Removing or renaming a value requires a type swap migration. Accepted, because these state sets are stable.

<a id="d-006"></a>

## D-006 — State transitions enforced in the database, mirrored in TypeScript
**Status:** Accepted · 2026-10-12

**Decision:** Allowed transitions (work orders, inspections, handovers) are enforced by `before update` triggers (authoritative). The same table lives in `features/*/domain.ts` for UX: showing only valid actions and validating early. Both are tested: pgTAP for the trigger, Vitest for the domain function.
**Consequence:** Two copies of the rule. A drift test (TS table vs DB behaviour) is planned in the integration suite. *Not built as of 2026-10-16 (post-MVP item in ROADMAP.md); each side is tested separately (pgTAP, Vitest).*

<a id="d-007"></a>

## D-007 — Cache Components on; no server caching of organization data
**Status:** Accepted · 2026-10-12

**Context:** `create-next-app@16.4.0` enables `cacheComponents` and `partialPrefetching`. Every Aegir page except the landing page depends on the user's session and RLS.
**Decision:** Keep Cache Components enabled (current framework default). Session reads sit inside `<Suspense>` boundaries; layouts stay static shells. **No `"use cache"` on organization data** in the MVP: queries run per request through the user-scoped client, deduplicated with `React.cache()`.
**Alternatives:** Disable `cacheComponents` (simpler mental model, loses static shell and prefetching); `use cache: private` (adds complexity for little gain at MVP scale).
**Fallback:** If Cache Components blocks delivery, a route may set `export const instant = false`. Disabling the flag globally is a recorded decision, not a silent change.

<a id="d-008"></a>

## D-008 — Hand-authored imperative migrations validated locally
**Status:** Accepted · 2026-10-12

**Context / skill conflict:** The `supabase` skill suggests iterating with `supabase db query` and generating migrations with `supabase db pull`. The project brief requires hand-authored, reviewable, timestamped migrations created with `supabase migration new`.
**Decision:** Create files with `npx supabase migration new <name>` and write SQL by hand. Validate with `db reset` (**local stack only**), `db lint`, `db advisors` and `test db`. `db query` may be used for local experiments, but the committed file is always reviewed and complete. Declarative schemas (`supabase/schemas/`) are not used.
**Consequence:** Migrations read as intentional design. `db reset` is never pointed at a linked or remote project.

<a id="d-009"></a>

## D-009 — Explicit Data API grants in every table migration
**Status:** Accepted · 2026-10-12

**Context:** Supabase changelog, 2026-04-28: new tables are no longer automatically exposed to the Data and GraphQL APIs (enforced on all projects from 2026-10-30).
**Decision:** Each table migration includes `grant select[, insert, update] ... to authenticated` matching its policies, enables RLS, and grants nothing to `anon`. No `delete` grants on safety records.

<a id="d-010"></a>

## D-010 — RLS helper functions in a `private` schema
**Status:** Accepted · 2026-10-12

**Decision:** `private.is_org_member()` and `private.has_org_role()` are `security definer`, `stable`, `set search_path = ''`, check `(select auth.uid())`, have execute revoked from `public`/`anon`, and are called in policies wrapped in `(select ...)` for per-statement caching. This follows the patterns in both Supabase skills (`security-rls-performance` and the `supabase` security checklist).
*Superseded in part by D-016:* the helpers are `private.my_org_ids()` and `private.my_org_ids_with_role(roles)` (set-returning), plus `private.my_colleague_ids()` and `private.assert_member_with_role()`; the `force row level security` note below still stands.
**Note on `force row level security`:** The postgres skill shows `force row level security`. We do not force it. App traffic uses the `authenticated` role, which is always subject to RLS. `force` only adds policy checks for the table owner, and that is the role our reviewed security-definer helpers and audit trigger run as. Forcing would need extra owner policies without improving isolation for app users. Revisit this if a non-owner privileged role is ever introduced.

<a id="d-011"></a>

## D-011 — Demo access strategy
**Status:** Accepted · 2026-10-12, option (a)

**Options:**
(a) Seeded demo accounts per role in a single demo organization, with credentials published in the README; no hard deletes are possible, and a documented reset script restores the seed. *(The reset script was built on 2026-10-16: `scripts/demo-reset.mjs`, D-043.)*
(b) A "Try the demo" button that signs into a shared **non-admin** account.
**Decision:** (a). Locally, `supabase/seed.sql` creates one user per role in "Northwind Shipping" plus a second organization ("Meridian Tankers") that exists to prove isolation. For the hosted demo (M5), publish manager, inspector, technician and viewer logins with a demo-only password, and never publish the admin login. **Constraint:** never publish a privileged account, never bypass RLS for the demo. Sign-out is session-local (D-020), so visitors sharing a demo login don't sign each other out.
**Implemented (2026-10-15):** `scripts/demo-seed.mjs` generates the hosted seed from `supabase/seed.sql` (one data source), with published logins on a run-time demo password and every other account, including the admin, on a random unpublished one (DEPLOYMENT.md step 6).

<a id="d-012"></a>

## D-012 — shadcn/ui with Base UI primitives (`base-nova`)
**Status:** Accepted · 2026-10-12

**Decision:** `shadcn@4.21.4 init --base base --preset nova`. Base UI is the current shadcn default. Custom triggers use the `render` prop (not Radix `asChild`). The CLI is pinned instead of `@latest` for reproducibility. The added `cn` package was verified as shadcn-maintained (`shadcn-ui/cn`).

<a id="d-013"></a>

## D-013 — Dependency pinning and Node version
**Status:** Accepted · 2026-10-12

**Decision:** `.npmrc` sets `save-exact=true` and `engine-strict=true`. All dependency versions are exact. Node ≥ 22 (`.nvmrc` = 24), because supabase-js dropped Node 20. `@types/node` is aligned to 24 (the scaffold shipped 20, which conflicted with Vitest 5's peer range).

<a id="d-014"></a>

## D-014 — Skill-supplied commands are reviewed, not auto-run
**Status:** Accepted · 2026-10-12

**Context:** The `shadcn` skill embeds `` !`npx shadcn@latest info --json` `` (runs on load) and pre-approves `npx shadcn@latest *`. `@latest` is unpinned.
**Decision:** Accepted for the read-only `info` call. For any state-changing shadcn command, use the pinned `shadcn@4.21.4` and review the diff. Never run `--overwrite` without approval. The skill's `scripts/showcase-coverage.mjs` was reviewed: it is a read-only file scanner.

<a id="d-015"></a>

## D-015 — Local auth hardening
**Status:** Accepted · 2026-10-12

**Decision:** `supabase/config.toml`: public sign-up disabled (`[auth] enable_signup = false`), minimum password length 10, `letters_digits` required. Users are provisioned into organizations. Mirror these settings on the hosted project during deployment.
**Correction (2026-10-12, M2):** M1 also set `[auth.email] enable_signup = false`. In GoTrue that flag disables the **entire email provider**, so password logins failed (`email_provider_disabled`). It is now `true`, with a comment explaining why. Sign-ups remain disabled by the global flag (verified: `signup_disabled`).

<a id="d-016"></a>

## D-016 — RLS helpers return sets; policies use `in (select …)`
**Status:** Accepted · 2026-10-12

**Context / skill nuance:** The postgres skill's example wraps a boolean helper as `(select private.is_team_member(team_id))`. Because that call passes the row's column, it is a *correlated* subquery and still runs once per row.
**Decision:** Helpers return the caller's organization IDs (`private.my_org_ids()`, `private.my_org_ids_with_role(roles)`), and policies use `organization_id in (select private.my_org_ids())`. The subquery is uncorrelated, so Postgres evaluates it once per statement and hashes the result. `(select auth.uid())` is still wrapped everywhere.
**Consequence:** One pattern for every table; fast with indexes on `organization_id`.

<a id="d-017"></a>

## D-017 — Column-level grants for immutable and server-owned columns
**Status:** Accepted · 2026-10-12

**Decision:** Instead of table-wide `INSERT`/`UPDATE`, each table grants only the client-writable columns ([DATA_MODEL.md §5a](DATA_MODEL.md#5a-privileges-column-level-grants)). Ownership (`organization_id`), authorship (`created_by`, `from_user_id`), lifecycle timestamps and IDs are therefore impossible to forge or change, without needing extra trigger code. Server-owned values are set by triggers (`private.set_created_by()` and friends).
**Trade-off:** Adding a client-editable column requires a grant in the same migration. A forgotten grant fails loudly (42501) rather than silently.

<a id="d-018"></a>

## D-018 — Seed data doubles as the pgTAP fixture contract
**Status:** Accepted · 2026-10-12

**Decision:** `supabase/seed.sql` uses fixed, readable UUIDs (`a…` Northwind, `b…` Meridian) documented at the top of the file. pgTAP tests reference them, create any extra rows they need, and roll back. This keeps tests short and readable.
**Trade-off:** Changing those fixture rows means updating tests. The contract is listed in the seed header.

<a id="d-019"></a>

## D-019 — One organization per session in the MVP
**Status:** Accepted · 2026-10-12

**Decision:** The schema supports many memberships per user, and RLS handles all of them. The UI uses the user's oldest membership (`getSessionState()` in `src/lib/auth/session.ts`). An organization switcher is future work. Users without a membership land on `/no-access`.

<a id="d-020"></a>

## D-020 — Session-local sign-out
**Status:** Accepted · 2026-10-12

**Context:** `supabase.auth.signOut()` defaults to `scope: "global"`, which revokes every session of the user. The E2E suite exposed this: one test signing out logged out parallel tests using the same account. On a shared demo login it would log out every visitor.
**Decision:** `signOut({ scope: "local" })`.

<a id="d-021"></a>

## D-021 — Playwright introduced in M2; serial locally
**Status:** Accepted · 2026-10-12

**Decision:** Playwright (`e2e/`, desktop and mobile projects) was added in M2 instead of M4, to verify the real sign-in flow (Server Actions, cookies, proxy). It runs against a production build and the local Supabase stack. Locally it runs with **1 worker** and a 10 s `expect` timeout: on an 8 GB laptop the full Supabase stack plus parallel browsers caused 10 s Auth→DB connection timeouts (diagnosed: Auth handled 5 concurrent sign-ins in 0.4 s when the machine was not saturated). If CI is added, the config uses 2 workers and 1 retry; there is no CI pipeline yet (checks run locally, TESTING.md).

<a id="d-022"></a>

## D-022 — Revoke Supabase's legacy default privileges
**Status:** Accepted · 2026-10-12

**Context:** Inspecting `pg_default_acl` on the local stack showed that new `public` tables, sequences and functions still get `ALL`/`EXECUTE` for `anon` and `authenticated` by default.
**Decision:** The first migration runs `alter default privileges for role postgres in schema public revoke …` for tables, sequences and functions, so new objects are private until a migration grants access. Each table migration also revokes explicitly before granting, so the result is identical on projects with either default.

<a id="d-023"></a>

## D-023 — Generated types formatted with Prettier
**Status:** Accepted · 2026-10-12

**Decision:** `npm run db:types` pipes `supabase gen types` through `prettier` (pinned devDependency) because the CLI emits unformatted TypeScript. Prettier is used only for this generated file; source formatting follows the existing style.

<a id="d-024"></a>

## D-024 — Impeccable for UI/UX quality, in Operate mode, with opt-in engine and hooks
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

<a id="d-025"></a>

## D-025 — One product authority: `docs/PRODUCT.md`; design system in `DESIGN.md`
**Status:** Accepted · 2026-10-12; fallback applied 2026-10-15 (root `PRODUCT.md` pointer).

**Context:** Impeccable's `init` writes `PRODUCT.md` at the repo root unless its context resolver finds an existing file. Ours is `docs/PRODUCT.md`, and two product documents would drift.
**Decision:** `docs/PRODUCT.md` stays the single product authority. When Impeccable needs product context, it reads that file. If the engine insists on a root `PRODUCT.md`, the root file is a short pointer to `docs/PRODUCT.md`, never a second copy. The visual design system is captured once with `impeccable document` as `DESIGN.md` (root, Impeccable's convention; linked from the README and ARCHITECTURE) at the start of M3, generated from the existing shadcn tokens rather than invented.
**Applied (2026-10-15):** `impeccable context` stopped resolving `docs/PRODUCT.md` (`productPath: null`) and `doctor` has no setting for it, so the fallback above was applied: a short root `PRODUCT.md` pointer (plus `## Platform: web`). Context now resolves `productPath: PRODUCT.md`; the pointer also keeps `init` from writing a competing copy. Product content stays in `docs/PRODUCT.md` only.

<a id="d-026"></a>

## D-026 — "The Bridge Console" design system
**Status:** Accepted · 2026-10-12

**Context:** The incumbent theme was stock shadcn "neutral" (fully achromatic) with no semantic colours for the severity, overdue and blocked states the product revolves around. Running `impeccable document` (scan mode), the owner chose: North Star **"The Bridge Console"**, palette **neutral + navy accent + status signals**, density **comfortable-compact**.
**Decision:** Captured in [DESIGN.md](../DESIGN.md) (tokens in `src/app/globals.css`; sidecar `.impeccable/design.json`):
- Primary `oklch(0.37 0.09 252)` "Harbour Navy" (dark: `oklch(0.8 0.07 252)`), cool console sidebar, navy focus ring and chart ramp.
- New semantic tokens `--success`, `--warning`, `--info` (light and dark) plus matching `Badge` variants, following shadcn's own `destructive` 10%-tint pattern.
- Light-theme `--destructive` darkened from `oklch(0.577 0.245 27.325)` to `oklch(0.53 0.21 27)`: shadcn's default measured **3.99:1** against its own tint (fails WCAG AA for small text). The new value measures 4.95:1.
- Every text/background pair was computed with an OKLCH→sRGB contrast script (not estimated); all pass AA.
- Named rules: Signal, Lit Instrument, Two-Channel, Ledger, Fixed Scale, Quiet Hull.
**Consequences:** M3 screens use semantic tokens and badge variants only; colour always means state.

<a id="d-027"></a>

## D-027 — `ButtonLink` for links styled as buttons
**Status:** Accepted · 2026-10-12 (supersedes the `nativeButton={false}` guidance from M2)

**Context:** The vessels E2E suite found "Add vessel" exposed as `button`, not `link`. With `render={<Link />}` and `nativeButton={false}`, Base UI's Button adds `role="button"` to the `<a>`, so assistive technology announces a button that navigates.
**Decision:** `src/components/shared/button-link.tsx`: a real Next `<Link>` styled with shadcn's exported `buttonVariants`. All eight usages were migrated (landing, empty, not-found, forbidden, detail, form).

<a id="d-028"></a>

## D-028 — The vessels list is a watch list
**Status:** Accepted · 2026-10-12 (owner's choice after the Impeccable critique)

**Decision:** The default sort is "Attention first" (`compareByAttention` in `features/vessels/domain.ts`): critical open work, then overdue work and inspections, then blocked, then open-work volume, then name. A–Z, recently updated and newest build year remain one click away. Each row shows an Attention column (critical/overdue/blocked signals). Vessel status badges were neutralised (active → outline, laid up → secondary), so colour means risk (DESIGN.md: The Signal Rule).
**Implementation:** attention counts come from two extra RLS-scoped queries (open work orders; scheduled or in-progress inspections past their date), run in parallel and aggregated in the DAL. Sorting by attention happens in memory, which is fine at fleet scale (tens to hundreds of vessels). Revisit with a SQL view if fleets grow to thousands.

<a id="d-029"></a>

## D-029 — 44px touch targets on coarse pointers only
**Status:** Accepted · 2026-10-12 (owner's choice)

**Context:** The critique's browser pass measured 32px controls (sidebar toggle 28px) on a Pixel 7.
**Decision:** Base components get `pointer-coarse:min-h-11` (44px; icon buttons also `min-w-11`). Desktop keeps 32px (comfortable-compact density). Verified by measurement: every control is 44px under `(pointer: coarse)` and 32px otherwise. Recorded as DESIGN.md's Deck Hand Rule.

<a id="d-030"></a>

## D-030 — E2E locator policy under Cache Components
**Status:** Accepted · 2026-10-12

**Context:** With Cache Components, Next 16 keeps previously visited routes mounted but hidden after client navigation, and streaming can briefly duplicate a resolved boundary. `getByLabel`/`getByText` also match hidden nodes, which caused strict-mode violations (for example, the hidden `/vessels` search box on `/vessels/new`).
**Decision:** E2E uses role locators for controls (which exclude hidden elements) and `.filter({ visible: true })` for text, scoped to `main` where the sidebar could match. Tests that create data use random valid IMO numbers and never assert global totals. Local data from E2E runs is reset with `npm run db:reset` (local only). *Superseded in part by D-040: the E2E global setup resets the local database before every run.*

<a id="d-031"></a>

## D-031 — Re-check the inspector's role on checklist writes (fix forward)
**Status:** Accepted · 2026-10-15

**Context:** While building the inspections UI, a review of `20261012070235_create_inspections.sql` found that the `inspection_items` update policy let the *assigned* inspector write results without re-checking their role. The assignment is validated when it is made, but a member whose role later changes (for example inspector → viewer) kept write access to that checklist. The `inspections` policy already re-checks the role.
**Decision:** New migration `20261014174645_require_inspector_role_for_item_updates.sql` replaces the policy so the assigned-inspector branch also requires a current `inspector` membership. The applied migration is not edited (fix forward). `supabase/tests/07_inspection_results.test.sql` covers it; run against the old policy (in a rolled-back transaction), its "former inspector" test fails, and it passes with the new one.

<a id="d-032"></a>

## D-032 — How an inspection is conducted
**Status:** Accepted · 2026-10-15

**Decision:**
- **Explicit start.** Results can be recorded only while an inspection is `in_progress`. "Start inspection" is a deliberate, audited step (the transition trigger allows recording on `scheduled` too; the UI does not offer it).
- **One tap for Pass and N/A** (they save immediately). **Fail opens a short form** (finding and severity, both required) and saves only on "Record failure", matching the database's check constraints.
- **Complete** is enabled only when no check is pending; the button explains how many are left. **Cancel** asks for confirmation (`AlertDialog`) because it freezes the checklist.
- **Inspector defaults to the person scheduling** when that person is an inspector (an inspector who left it unassigned could not conduct their own inspection; found by E2E). Managers default to "Assign later".
- **Templates add, never replace.** "Add from template" appends its checks (dropping blank rows) and fills an empty title; typed checks are never discarded.
- **Follow-up is derived, not stored:** a failed check "needs follow-up" until a work order references it (`work_orders.inspection_item_id`). Raising that work order arrives with the work-orders slice.

<a id="d-033"></a>

## D-033 — Shared URL filters; inspection writes revalidate the whole app shell
**Status:** Accepted · 2026-10-15

**Decision:** `src/components/shared/url-filters.tsx` (`useUrlFilters`, `FilterSelect`) replaces the vessels-only copy, so every list keeps its filters in the URL the same way. Inspection mutations call `revalidatePath("/", "layout")` rather than a single path, because inspection state also feeds the vessel watch list, vessel detail and (next) the dashboard. All data is per-request (no `"use cache"`), so this only refreshes the client router cache; there is no server cache to over-invalidate.

<a id="d-034"></a>

## D-034 — How work orders are worked
**Status:** Accepted · 2026-10-15

**Decision:**
- **The list is a queue.** Open, "Assigned to me" and blocked views sort by urgency (`compareByUrgency`): overdue first, then priority, then the earliest due date (undated last). *Order superseded by D-037 (tiered urgency).* Completed work reads as a log (most recent first).
- **Only legal moves are offered.** Buttons come from `NEXT_STATUSES`, which mirrors the transition trigger: Start / Resume (primary), Mark blocked, Back to open, Mark completed (primary when in progress).
- **Blocking says why**, in an inline form (no modal); the reason shows as a callout on the record and in the history. **Completion is confirmed** with an `AlertDialog`, because completed is terminal (no edits, no reopening).
- **Follow-ups start from the finding.** "Raise work order" on a failed check opens the form with the vessel fixed, the check as the title ("Fix: …"), the finding as the description and the finding's severity as the priority. If work was already raised for that check, the form says so (duplicates are allowed, since a second visit can be legitimate).
- **History comes from the audit log** (`audit_events`, written by the database), turned into plain entries by `describeAuditEvent`. Actor names are looked up separately because `actor_id` deliberately has no foreign key; seed rows have no actor and show as "System (seed data)". *(Generalised by D-042: one `features/audit` implementation for every record and the log.)*
- **Details are manager-only.** Assignees (inspector/technician) see status buttons but no "Edit details"; the trigger rejects detail edits from them anyway (42501), and the action explains it.
- `listVesselNames` moved to `features/vessels/server/queries.ts`, since both lists' vessel filters use it.

<a id="d-035"></a>

## D-035 — The dashboard is a set of queues, assembled in one pure function
**Status:** Accepted · 2026-10-15

**Context:** PRODUCT.md asks for active vessels, inspections due or overdue, open and overdue work orders, recent failed checks and pending handovers, all from live queries. DESIGN.md rules out hero-metric tiles as a dashboard's structure.
**Decision:**
- **Structure:** one compact row of five headline figures (each a link to the list behind it), then queue panels: work queue, inspections due, failed checks, vessels needing attention, pending handovers. Figures stay in ink; signals ride on badges with an icon and words.
- **Each panel is the head of an existing list, in that list's order:** the work queue uses `compareByUrgency` (the `/work-orders` default view), inspections due are overdue plus due within **7 days**, earliest first (the head of `/inspections`), and vessels use `compareByAttention` (the watch list), limited to vessels that `needsAttention`. Panels show 5 rows and link to the full list.
- **A failed check without a work order is never truncated** (PRODUCT.md principle 1). The panel lists every unaddressed check, then failures with work raised in the last **30 days**, ordered follow-up first → severity → most recent, and offers "Raise work order" to roles that may create work.
- **Handovers** list the ones addressed to the viewer first, then the longest-waiting. *(Until slice 5 their rows were plain text capped at 8; since D-041 they link to the handover, cap at 5 like the other panels and the header links to `/handovers`.)*
- **Assembly is pure:** `getDashboard()` runs five RLS-scoped reads in parallel (vessels, unfinished work orders, open inspections, failed checks with their work orders, pending handovers) and hands plain rows to `buildDashboard()` in `features/dashboard/domain.ts`, which is unit-tested. The per-vessel tally moved to `tallyAttention()` in `features/vessels/domain.ts` and is shared with the watch list.
- **Freshness:** all reads are per request (no `"use cache"`, D-007). Vessel saves now revalidate the app-shell layout like inspection and work-order writes (D-033), because vessel status feeds the dashboard.
**Consequences:** aggregation happens in memory, which is fine at fleet scale (as D-028). The failed-check read has no row limit so the follow-up count stays exact. PostgREST's `max_rows` (1000 by default) would cap it at very large volumes; at that point move the counts into a `security_invoker` view or RPC. No migration was needed: every filter is covered by an existing index (`work_orders_org_status_due_idx`, `inspections_org_status_scheduled_idx`, `inspection_items_org_result_idx`, `handovers_org_status_created_idx`).

<a id="d-036"></a>

## D-036 — Completing an inspection is confirmed; unaddressed failures warn but don't block
**Status:** Accepted · 2026-10-15 (owner's choice after the Impeccable critique of inspections and work orders)

**Context:** The critique (29/40) found completion was one unconfirmed, silent click although it freezes the checklist, while cancelling and completing a work order both confirm. It also asked whether completion should require every failed check to have a work order.
**Decision:**
- **Complete is confirmed** with an `AlertDialog` that states the result summary ("3 passed · 1 failed · 1 N/A"), says the checklist will be frozen, and lists failed checks without a work order, each with "Raise work order" for roles that may create work.
- **Unaddressed failures warn but do not block** completion (owner's choice). They stay visible: the record's `SavedNotice` repeats them ("Inspection completed · 1 failed check needs a work order") and the dashboard never truncates them (D-035). No schema change; a mandatory disposition ("work order or no work needed") would need a migration and pgTAP, and remains an option.
- The action redirects to `?saved=completed`; Complete is repeated at the end of the checklist.
- Same pass, from the critique: a recorded failure collapses to a read-only finding with "Edit finding"; severity is a radio group of choice cards with the full guidance; an inspection shows Overdue beside its lifecycle badge; select and menu items get 44px coarse-pointer targets; record-section card titles are `h2`; alert icons take their tint from the `Alert` (CONVENTIONS.md §6).

<a id="d-037"></a>

## D-037 — Protect linked failures; follow-ups return to the inspection; tiered urgency
**Status:** Accepted · 2026-10-15 (owner's choices after the Impeccable re-critique, 27/40)

**Context:** The re-critique found a pre-existing defect: one tap on Pass or N/A saved immediately and cleared a recorded failure's finding and severity, even when a work order followed it up (PRODUCT.md principle 1). It also found that raising work from a check left the inspection behind, that sub-tasks left competing primary actions live, and that "overdue first" ranked a late low-priority job above critical blocked work.
**Decision:**
- **Linked failures are locked in the database.** Migration `20261015051635_protect_linked_failed_checks` adds a `BEFORE UPDATE OF result` trigger on `inspection_items`: a failed check that a work order references can no longer change its result (P0001). Its finding and severity can still be refined while the inspection is open; `audit_events` keeps every version. Security invoker (writers can already read their organization's work orders). pgTAP `08_linked_failed_checks` (7) was red against the old schema first.
- **In the UI**, Pass/N/A are disabled on a linked failure with the reason shown; replacing an unlinked recorded failure asks inline first ("Replace this failure with Pass? The finding and its severity will be removed."). The DAL maps the trigger's error to plain language.
- **Follow-ups return to the inspection.** A work order raised from a check redirects to `/inspections/{id}?saved=raised&workOrder={id}`; the notice links to the new work order. The raise form's context shows the finding's severity badge. Due dates are **not** suggested from severity: that would invent a maintenance policy the product doesn't have.
- **One live primary per sub-task.** The block form hides the other status moves; Complete waits (disabled, with the reason) while any finding form or replace question is open, so completion can't drop an unsaved finding.
- **Notices survive reused pages.** Cache Components keeps a page mounted after client navigation, so a redirect back reused `SavedNotice` with stale visibility and hid "Work order raised" (found in the visual round, reproduced in E2E, then fixed): the notice now resets when its message changes.
- **Tiered urgency** replaces D-034's "overdue first": 0 overdue critical/high · 1 critical (including blocked) · 2 other overdue · 3 the rest; then priority, due date, title. `/work-orders` queues and the dashboard work queue share it (`compareByUrgency`). "Blocked for N days" is not shown yet (it needs the status-change time from the audit log).

<a id="d-038"></a>

## D-038 — Dashboard accessibility pass; figures jump to their panels; light-only MVP
**Status:** Accepted · 2026-10-15 (owner's choices after the dashboard critique, 28/40, and audit, 15/20)

**Decision:**
- **Figures jump to their own panel** (`#work-queue`, `#inspections-due`, …) instead of mixing in-page jumps with list links whose counts differed ("Inspections due 3" opened "4 open inspections"). Panels are focusable (`tabIndex={-1}`), so focus follows the jump; panel headers keep the "All … open" / "Watch list" links to the full lists. Supersedes D-035's "each figure links to the list behind it".
- **Large text (WCAG 1.4.4):** row headers wrap (title `flex-[1_1_12rem]`, badges no longer `shrink-0`); the figure grid uses container queries in rem (`@xs` two columns, `@5xl` five), so larger text gets fewer, wider columns instead of clipped signals.
- **Touch (WCAG 2.5.8, Deck Hand Rule):** the failed check's link to its work order is a `ButtonLink` ("View work order", named with its status); "N assigned to you" moved from an inline sentence link to a header `ButtonLink`. Both are 44px on coarse pointers.
- **Never silent:** the Failed checks panel says how many rows it leaves out (`failedChecksTotal`).
- **Shell (every page):** "Skip to content" link to a focusable `#content`; the sidebar menu is a `nav` landmark ("Main") with `aria-current="page"`; the skeleton pulse stops under reduced motion. Figure links carry sentence-like names ("Inspections due: 3, 2 overdue, 1 in the next 7 days"); the summary region is "Fleet summary"; the loading skeleton is announced and matches the real layout.
- **Light-only MVP.** The dark tokens in `globals.css` stay (they pass contrast when forced), but nothing applies `.dark`; following the OS or adding a toggle is on the roadmap and needs a dark visual pass of every screen first.
- **Deferred (owner's choice):** the role-aware "For you" band (the critique's other P1), "You" on inspection rows, quieter overdue signals, and folding the Vessels panel; also the shell `<header>` inside `<main>` (a shadcn `SidebarInset` structure).

<a id="d-039"></a>

## D-039 — Security headers; CSP without nonces
**Status:** Accepted · 2026-10-15

**Context:** The deployed site sent only HSTS (from Vercel): it could be framed by other sites and had no Content-Security-Policy. The Next.js 16 guide offers nonce-based CSP, which requires dynamic rendering for every page and is incompatible with Partial Prerendering, or a policy without nonces set in `next.config`.
**Decision:**
- Headers come from `src/lib/security-headers.ts` (pure, unit-tested) through `next.config.ts` `headers()` on every route: CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera, microphone, geolocation, browsing-topics off), `Cross-Origin-Opener-Policy: same-origin`.
- **CSP without nonces** (Next's "Without Nonces" policy), keeping the prerendered static shells (D-007, Cache Components): `script-src 'self' 'unsafe-inline'` (plus `'unsafe-eval'` in development only), `style-src 'self' 'unsafe-inline'`, `connect-src 'self'` (the browser never calls Supabase; data flows through Server Components and Actions), `font-src 'self'` (next/font self-hosts), `img-src 'self' blob: data:`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`, and `upgrade-insecure-requests` only when `VERCEL=1` (local production builds for E2E are plain http).
- SRI (experimental) was not used: it covers external files only, while the streamed React payload is inline.
**Consequences:** framing, plugins, base-URL hijacking, cross-origin form posts and exfiltration through fetch/XHR are blocked; inline script injection is mitigated by React's escaping rather than CSP (SECURITY.md §9). E2E (`security-headers.spec.ts`) checks the headers and fails on any CSP violation across sign-in, the dashboard, the lists and a client-side select. Using the browser Supabase client later requires adding its origin to `connect-src`.

<a id="d-040"></a>

## D-040 — M4 verification: axe on every route, container-query layouts, E2E from a fresh seed
**Status:** Accepted · 2026-10-15

**Decision:**
- **Accessibility gate:** `@axe-core/playwright` 4.13.0 (pinned dev dependency, Deque; latest stable, published 2026-08-11) runs WCAG 2.2 A/AA rules on every route, signed out and as a manager, plus an inspector's open Fail panel, on desktop and Pixel 7 (`e2e/accessibility.spec.ts`). Zero violations is the bar. A sanity run showed it passes 22 rules on the login page and catches injected `image-alt` / `button-name` failures. The spec also requires a level-1 heading on every page, which axe's WCAG tags don't check and which the login and no-access pages lacked.
- **Enlarged text (WCAG 1.4.4) is handled by container queries in rem,** not viewport breakpoints: the vessel, inspection and work-order lists switch from table to stacked rows at `@4xl` of their own width, filter bars stack at `@xs`/`@3xl`, and record titles wrap instead of truncating. At 200% text the desktop tables had clipped whole columns behind `overflow-hidden`; now nothing is clipped at 320–1360px. Filter values wrap; the triggers keep 32px (fine pointer) and 44px (coarse pointer).
- **E2E isolation:** Playwright `globalSetup` rebuilds the local database (`supabase db reset --local`, always the explicit flag because the repo is linked to the hosted project) before each run.
- **Intermittent E2E failures, root cause (found 2026-10-15):** with a fresh seed each run, the mobile "viewer follows inspections" test failed once more, and this time its output was kept: `getByText('Work order: Repair main…')` resolved to two elements, the visible one in `#content` and a hidden duplicate (D-030: still-mounted routes and briefly duplicated streamed boundaries). That locator lacked the `visible` filter. **Policy refined:** every text assertion about what a user sees uses `.filter({ visible: true })` (applied across all specs); **tenant-isolation absence checks stay unfiltered**, because hidden markup still reaches the browser and a hidden leak is still a leak (the vessels spec had filtered them; now strict). The earlier dashboard intermittent (row not found within 10 s in a ~4× slower run) did not recur and is most likely the same duplicate-boundary class or plain slowness; it stays listed in TESTING.md until a clean history says otherwise.

<a id="d-041"></a>

## D-041 — How handovers are sent and acknowledged
**Status:** Accepted · 2026-10-15

**Decision:**
- **Inbox order** (`compareHandovers`): pending handovers addressed to me, then other pending ones oldest first, then acknowledged ones newest first. Views: Pending (default), Waiting for you, Sent by you, Acknowledged, All; vessel filter.
- **Sending starts from the work**: "Hand over" on work-order pages fixes the subject (the database fills the vessel and rejects a mismatch); on vessel pages it preselects the vessel; from `/handovers/new` the work-order choices follow the chosen vessel. Recipients are colleagues with a crew role, never the sender or a viewer (mirrors the trigger). `?workOrder=` / `?vessel=` are validated as UUIDs and must be among the caller's RLS-scoped options.
- **Acknowledge without a confirmation dialog**: unlike completing an inspection or a work order, acknowledging destroys nothing (the content was frozen at sending); the button's hint states what it records. Only the recipient sees it (RLS enforces the same); others see who it is waiting for.
- **Acknowledging means receipt, not reassignment** (owner's choice after the critique, 29/40): "I've read it and know what's outstanding". An attached work order keeps its assignee; reassigning stays a manager action. The first copy ("taken the work over") overstated this and was corrected everywhere.
- **The record reads tasks first**: header, outstanding tasks, the acknowledge action directly under them (or who it is waiting for), then the facts. From/to live in the header line only.
- **Inbox rows show date and hour**; the recipient picker shows each colleague's role ("Marcus Reyes · Fleet manager").
- **Times in UTC with the hour** (`formatDateTime`), since handovers happen at shift changes.
- **Insert typing**: `from_user_id` is NOT NULL and trigger-owned (no client grant, D-017); the generated Insert type can't express that, so the row is typed `Omit<…, "from_user_id">` and cast once at the insert, with a comment. A `default auth.uid()` migration was considered and not taken (a production schema change for a typing nicety).
- The dashboard's handover rows now link to the handover; the panel caps at 5 like the others, with "All N pending" in its header.

<a id="d-042"></a>

## D-042 — How the audit log is read
**Status:** Accepted · 2026-10-15

**Context:** PRODUCT.md asks for organization-wide history, filterable by record type, readable by every role (viewers are the auditors). The database has recorded every insert and change on six tables since M2 (`audit_events`, written only by the trigger, D-017 and §5 of SECURITY.md); only work orders showed it (D-034).
**Decision:**
- **Two places, one implementation** (owner's choice): an organization-wide **Audit log** at `/audit` (sidebar), and a **History** card on every record page (vessels, inspections, work orders, handovers). Both use `features/audit` (`describeAuditEvent`, `getRecordHistory`, `listAuditEvents`); the work-order-only history code from D-034 is gone.
- **Values for short fields, names for long text** (owner's choice): old → new for status, priority, result, severity, role, assignee/inspector/recipient (by name), dates and short text (names, titles); descriptions, findings, notes, outstanding tasks and block reasons are named with "added / removed / changed", not quoted. The record shows the current text; the block reason is quoted once, as the note on the move into Blocked. Columns the app doesn't know are still listed by name, never dropped; keys and timestamps are bookkeeping and never make an entry.
- **Every role reads the whole log**, members included. RLS already allows it; hiding entries in the UI would not be security.
- **Inspections include their checks**: a check has no page, so its changes appear in its inspection's history, named by the check, and log entries for a check link to its inspection.
- **Newest first, 50 per page, keyset paging** on `(occurred_at, id)` with the existing `audit_events_org_occurred_idx`. The cursor in the URL is the last event id (`?before=`); its timestamp is read back server-side, and the id breaks ties between events of one transaction (an inspection and its checks share `now()`; pgTAP `10_audit_log_access` pins this). An unknown or foreign cursor shows the newest page. No migration.
- **Filters:** record type (URL slugs, not table names) and person ("System (seed data)" for events with no actor). A new filter clears the cursor. Entries are grouped by UTC day; times are UTC.
- **Names are looked up**, since `actor_id` has no foreign key: one query for every person an event mentions, one per record type for record names (falling back to the insert snapshot). Unknown people show as "Former member".
- **Record history shows the latest 100 changes**, oldest first, and says so when there are more; the full trail is in the log.
- **The most important change leads.** Each record type's fields are ordered by importance (a check's result, a work order's priority, an inspection's inspector), and the first changed field is the entry's headline; the rest follow. Creation states what the record started as: "Added to the checklist as Fail (High severity)", "Raised with High priority", "Scheduled for 25 Sept 2026", "Handed over to …", "Joined as …".
- **Entries say where they belong**: in the log, the record link reads "name · type · context" (a check: its inspection and vessel; a work order, inspection or handover: its vessel), so same-named records get distinct link names, and the link stretches over the whole entry (44 px+ target). The actor reads "by …".
- **Seed events have no actor** (the seed runs as the database owner), so a record can say "Scheduled by Marcus Reyes" above a History entry "by System (seed data)". Owner's choice: explain it in one line on cards that contain seed events, not re-attribute the seed (production is already seeded; changing it would need a destructive reseed).
- **Review outcomes** (Impeccable critique 28/40 Good, dual-agent; audit 16/20 Good; detector `[]`): fixed the P1s (failed check buried under "Changed 3 fields"; entries without vessel/inspection context), the P2s (paging bounded by `occurred_at <= cursor` so the index seeks instead of filtering; an unknown person id shows "Former or unknown person" instead of "Everyone" and the empty state names the filters; the pager survives a page with nothing readable; "by" before the actor; "Showing the newest 50 changes" instead of a count that read as a total, announced with the filters; whole-row links with an inset focus ring; seed attribution note) and the quick P3s (id checked as a UUID before it reaches a filter; malformed dates and person ids degrade instead of throwing; arrow and type label don't break from their values; `<time>` in History; filter skeleton at the real height). Deferred: date and vessel filters, sticky day headings, collapsing runs on one record, focus after paging, roles in the person filter, an inspection with ~200 checks exceeding URL limits in its history query.
**Consequences:** No schema change. The log page makes up to 10 small queries per page (cursor, events, people for the filter and for names, ≤6 record lookups), all RLS-scoped and organization-pinned. A per-record filter in the log and export are not built.

<a id="d-043"></a>

## D-043 — Fixes from the independent review
**Status:** Accepted · 2026-10-16

**Context:** M6's independent review ran four fresh, read-only reviewers (security, database and migrations, tests, docs accuracy). It found no Critical issues: tenant isolation held under every cross-organization probe, every Server Action re-verifies the user and validates with Zod, there are no secrets in the tree or history. Each finding below was reproduced before it was fixed. The owner chose to fix all confirmed findings (database, app, tests, docs) and to add a demo reset script.
**Decision:** one forward migration, `20261016000517_harden_after_independent_review`, plus app, test and doc fixes:
- **Users can be deleted again.** The freeze triggers on completed/cancelled inspections and completed work orders rejected the `ON DELETE SET NULL` that removing a user performs, so 6 of 8 seed users couldn't be deleted (4 because of frozen records). The only change now allowed on a frozen row is that cleanup: people references only, only to null, only when the profile no longer exists, and only below a client statement (`pg_trigger_depth() > 1`). Handover sender/recipient stay `restrict` (a handover names its people for good).
- **Who may add checklist items** now matches who may change them (D-031): managers/admins, the assigned inspector, or the creator while the inspection is scheduled (so `create_inspection`, which runs as the caller, keeps working when scheduling for a colleague). Before, any inspector could add checks to any inspection, and one injected pending check blocked its completion.
- **Two races are serialised.** Adding or changing a check while its inspection is being completed, and linking a work order to a check while its result changes, could interleave (reproduced with two sessions). The writers now take `FOR SHARE` on the parent row through narrow definer helpers in `private` (`lock_inspection`, `lock_inspection_item`); a `FOR SHARE` read as the caller would have needed the UPDATE policy, which most writers of checks don't pass.
- **Acknowledging a handover re-checks the recipient's role** (a recipient later demoted to viewer can't), as D-031 did for checks.
- **Deletions are audited** (`action = 'delete'`, snapshot of the old row), on all six audited tables. Removing a membership, which is how access is withdrawn, now leaves a trace; the log reads "Removed (was Technician)".
- **Queues are cut after sorting, never before.** Work-order queues read overdue work and the rest separately, each most important first; the handover inbox reads its three parts in inbox order. Past 200 rows the most urgent and longest-waiting can no longer drop out.
- **Session cookies are `httpOnly`** (and `Secure` on Vercel): the browser Supabase client is unused, so scripts never need the refresh token. `shadcn` (the CLI, used only for a build-time CSS import) moved to devDependencies: `npm audit --omit=dev` is clean.
- **Open-redirect guard** re-checks the normalised path (`/..//evil.com` normalised to `//evil.com`; not exploitable before only because a second pass caught it).
- **Tests:** `11_review_hardening` (11, six red against the old schema) and `12_read_isolation` (28: each organization sees its own rows and none of the other's, table by table; the app's own organization filter meant E2E "not found" checks couldn't prove this). The audit E2E no longer hard-codes a date the seed computes from today; isolation checks are unfiltered again and text locators filtered (D-040); dashboard figures are read from the accessible name and retried; the session cookie flag is asserted.
- **Demo reset** (`scripts/demo-reset.mjs`): wipes the two demo organizations and the seed's logins, then runs the demo seed unchanged, in one transaction. It refuses without `-v confirm=reset-demo` and on any database holding another organization. Running it on production is destructive and needs the owner's explicit approval each time (AGENTS.md rule 6).
- **Docs** brought in line with the code (anchors, counts, statuses, conventions, superseded decisions).
**Not taken now (owner's choice):** CI (no pipeline; checks run locally), a Vercel Firewall rate limit on sign-in (Supabase sees Vercel's egress IPs, so its per-IP limit is shared by all visitors), unit tests for the Server Action layer, an index for the audit log's person filter, `private` default privileges, invariants enforced only in Zod. Listed in ROADMAP.md.
**Consequences:** One more migration to push to production (owner's step). Deleting a user with handovers still fails by design.

<a id="d-044"></a>

## D-044 — CI on every push, and a per-visitor sign-in limit at the edge
**Status:** Accepted · 2026-10-16

**Context:** With the MVP deployed, two Post-MVP items carried the most risk for the least work. Nothing ran on push, so a commit could break lint, types, the build or a database rule unnoticed until the next local run. And sign-in runs in a Server Action, so Supabase sees Vercel's egress IPs: its per-IP limit (about 30 attempts per 5 minutes) is shared by every visitor of a demo whose password is public, and one visitor could lock everyone out (SECURITY.md §9).

**Decision:**
- **CI:** `.github/workflows/ci.yml` runs on pushes to `main` and on pull requests, as two parallel jobs.
  - *App:* `npm ci`, lint, typecheck, unit tests, build, `npm audit --omit=dev --audit-level=high`. The build gets placeholder public Supabase values: it validates them but never calls Supabase.
  - *Database:* `supabase db start` (Postgres only: every migration, then the seed), `db lint --fail-on error`, pgTAP, `db advisors --fail-on warn` (a fresh database's INFO "unused index" notes don't fail it), and the generated types must match the committed file.
  - *Hardening:* `permissions: contents: read`, `persist-credentials: false`, no secrets or tokens of any kind, superseded runs cancelled, actions pinned to commit SHAs (checkout v7.0.1, setup-node v7.0.0: the newest releases at least two weeks old). The Supabase CLI is the pinned dev dependency, as locally.
  - *E2E stays local:* it needs the whole Supabase stack and takes about five minutes.
  - *Gates proven:* each one was made to fail on a deliberate fault locally (a table without RLS, a function reading a missing table, a failing pgTAP test). That found a CLI quirk: with agent detection on, `--fail-on` exits 0 even on an ERROR finding; with `--agent no` it exits 1. The workflow passes `--agent no` explicitly.
- **Sign-in limit at the edge:** one Vercel WAF rate-limit rule (Hobby allows one per project): `POST` requests to path `/login`, fixed window 300 s, 10 requests, keyed by IP, default 429 response. One visitor can then use at most a third of Supabase's shared budget. Page loads (GET) and signed-in traffic aren't counted. The owner applies it in the Vercel dashboard (DEPLOYMENT.md); it isn't in code.
- **The login page copes with the 429.** The firewall answers before the app, so the Server Action gets a bare 429 and Next replaced the whole page with its generic "This page couldn't load". `src/app/(auth)/login/error.tsx` now shows the sign-in card with the cause and the recovery ("Wait a minute, then try again"), with the heading focused. Next forwards only a `text/plain` body as the error message, not the status, so the copy covers both a rate limit and a dropped connection. E2E simulates the 429; it was red against Next's generic page first.

**Not taken:** a CAPTCHA (friction on a demo); an app-level limiter (needs shared storage, and it would run after the request has already cost a function invocation).

**Consequences:** A push that breaks lint, types, unit tests, the build, a migration, an RLS test or the generated types turns red; CI never touches the hosted project. The production smoke test makes 7 sign-in attempts, so it fits the limit once per 5 minutes from one IP; a second run straight after will see 429s. Vercel counts rate limits per region, so traffic spread across regions can exceed the limit in total.
