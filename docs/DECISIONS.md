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
**Consequence:** Two copies of the rule. A drift test (TS table vs DB behaviour) is planned in the integration suite. *Built 2026-10-16 (D-049): every status pair of work orders, inspections and handovers is checked against the database.*

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

<a id="d-045"></a>

## D-045 — All rights reserved
**Status:** Accepted · 2026-10-16

**Context:** The repository is public as a portfolio project and had no license file, which already means all rights reserved by default, but left readers guessing (flagged by the M6 docs review).

**Decision:** The owner keeps all rights. `LICENSE` says so explicitly: the code is public to read; using, copying, modifying or distributing it needs written permission. It notes that GitHub's Terms of Service still let people view and fork public repositories on GitHub, which grants no further rights. `package.json` declares `"license": "UNLICENSED"` (npm's marker for proprietary code); the README has a License section.

**Consequences:** No one else may reuse the code without asking. Revisit (e.g. MIT) if the owner wants others to build on it.

<a id="d-046"></a>

## D-046 — The landing page: the bridge at night, a role picker, real screenshots
**Status:** Accepted · 2026-10-16

**Context:** The homepage was the name, one sentence and a Sign in button. The roadmap asked for a marketing page, the only Impeccable **Persuade** surface (D-024): a clear promise, a call to action to try the demo, the workflows with real screenshots, why the records can be trusted, the four demo roles, and links to the source and docs. It had to stay static, use self-hosted images within the CSP (D-039), pass axe, and stay fast on a phone. It also had to be true: synthetic data, no invented customers or numbers.

**Decision:**
- **Structure.** Impeccable's surface roll (seed `08e5ca3c`) dealt three structures inside "The Bridge Console". The owner chose **Night bridge**, with the role detail from "Pick your watch" and the facts list from "Spec sheet" reused as the trust section. The build was code-led, because no image generation was available. The direction contract is in `.impeccable/surfaces/src-app-page-tsx.md`.
- **The page, in order:**
  1. a hero on a deep Harbour Navy field: the promise, a one-sentence lede, the role picker, and the real dashboard with its signals lit;
  2. one failed check followed through four steps (inspection, work order, handover, dashboard), each with real badges and a screenshot;
  3. "Records you can stand behind": isolation, the audit trail, rules in the database, tests;
  4. "Try it as each role";
  5. a footer with the source and docs links and the not-certified note.
- **Who it's for is shown, not listed.** Each step names the role that does it, so there is no separate "who it's for" section of same-size cards.
- **Night tokens.** The hero and header apply `.dark` plus a new `.night` scope (`globals.css`): the dark-theme tokens with a navy field (Night Hull `oklch(0.21 0.045 252)`, Night Panel, Night Mist). Contrast was computed: foreground 17:1, muted 8.9:1, every signal at least 4.7:1 on its tint over the field. Red reaches only 4.3:1 over Night Panel, so badges never sit on a card there. DESIGN.md records the tokens, two display type steps for this page only, and the Landing page component rules.
- **Static.** `src/app/page.tsx` composes `src/features/landing/*`. It reads no session and no database, and the build marks `/` as static (○). Copy comes from PRODUCT.md and SECURITY.md, with no counts that would go stale.
- **Demo sign-in.**
  - Each role links to `/login?as=<role>`. The login page parses `as` with Zod against the four published roles (`src/features/auth/demo-accounts.ts`) and pre-fills the email only.
  - The administrator and the second organization can never be pre-filled. A password never goes in a URL.
  - There is no sign-in form on `/`: the firewall limit covers `POST /login` only (D-044), and a second form would get around it.
  - A visitor who is already signed in and follows a role link lands on their own dashboard (the proxy's existing redirect).
- **The demo password is shown**, as the README shows it. It is public by design (D-011) and opens only the four shared accounts. It lives in one constant, `HOSTED_DEMO_PASSWORD`. The local seed uses a different password, which the page points to through the README.
- **Screenshots.**
  - The page imports the README captures straight from `docs/screenshots/` into `next/image`, so one set serves both. Next serves them optimised from this site (`/_next/image`) with `data:` blur placeholders, which the existing CSP (`img-src 'self' blob: data:`) already allows. The CSP did not change.
  - The hero uses art direction (`getImageProps` + `<picture>`): the desktop capture from 64rem up, the phone capture below.
  - On narrow sections, `ScreenshotFrame` zooms each desktop capture to the region its step names. A rem container query drives the switch, so enlarged text gets the zoom too.

**Not taken:**
- Dark-theme recaptures for the hero, which the finish review suggested: the app ships light-only (D-038), so a dark capture would show a theme the product doesn't have.
- A sign-in form or a one-click demo button on `/` (rate limit, above; D-011 option (b) was already declined).
- Filled "Sign in" chips in every role row: that would make four navy primaries in one region.

**Consequences:**
- Refreshing the screenshots (`scripts/capture-screenshots.mjs`) updates the landing page automatically.
- **But the hero's lit-signal positions (`LIT_SIGNALS`) and each step's zoom region (`focus`) are measured on the current captures.** After a recapture, re-check them in a desktop and Pixel 7 screenshot.
- Vercel's image optimisation counts against the Hobby plan's monthly quota. Seven source images at a few widths are well inside it.
- Phones download the zoomed step images at up to the capture's full width. They are lazy-loaded below the fold, so they don't affect the first paint.

<a id="d-047"></a>

## D-047 — Node pinned to 24.x everywhere; Node 26 waits for Vercel
**Status:** Accepted · 2026-10-16 (refines D-013)

**Context:**
- Node 24 enters Maintenance LTS on 2026-10-20, and Node 26 becomes Active LTS on 2026-10-28 (nodejs/Release `schedule.json`). Node 24 keeps security fixes until 2028-04-30.
- Vercel Functions currently offer only 24.x (the default) and 22.x. Vercel's Node 26 announcement covers its Sandbox product, not Functions.
- `package.json` declared `"engines": { "node": ">=22" }`. Vercel picks the deployed major version from `engines`. Once Vercel adds 26, that open range could move production to 26 on its own, while `.nvmrc`, CI and local development stay on 24.

**Decision:**
- `engines` is `"24.x"` in `package.json` and in the lockfile's root entry. That one line was edited by hand: `npm install --package-lock-only` also rewrote unrelated platform fields (dropping `libc` from native binaries), so its output was discarded.
- `.nvmrc` (24) and CI (`node-version-file: .nvmrc`) are unchanged. Local development, CI and production now run the same major version, and only a commit can change it.
- With `engine-strict=true`, `npm ci` refuses any other Node major locally.
- Moving to Node 26 is a roadmap item for when Vercel Functions offer 26.x. It must be one change: `.nvmrc`, `engines` `"26.x"`, the Vercel project's Node.js setting and `@types/node` together, followed by the full verification list and a production smoke run.

**Consequences:**
- Contributors need Node 24, not just any version from 22 up (README updated).
- Production can't drift to a Node major that CI never ran.

<a id="d-048"></a>

## D-048 — The app shell with enlarged text: rem breakpoints in JavaScript, a capped sidebar
**Status:** Accepted · 2026-10-16

**Context:** The roadmap listed "app shell at 768px with 200% text: the sidebar forces sideways scroll". Reproducing it (with a manager, on 8 pages) showed two problems, one of them worse than the listed one:
- **The page's root font at 200%** (`html { font-size: 200% }`) doubles rem lengths but doesn't move media queries. The 16rem sidebar became 512px, so at 768px every page scrolled sideways by 64–432px. At 1024px, `/work-orders/new` overflowed by 176px: its assignee select was a fixed `md:w-80` (20rem, so 640px).
- **The browser's default font size at 32px**, which is how most people enlarge text (Chrome: Settings → Appearance → Font size). This also moves rem media queries. Tailwind's `md:` (48rem) then starts at 1536px, so the CSS hid the desktop sidebar below that. But `useIsMobile` used a px query (`max-width: 767px`), so it still thought this was desktop and never offered the phone sheet. **From 768 to 1535px the navigation was unreachable**: no rail, and the menu button opened nothing.

**Decision:**
- `useIsMobile` queries `(width < 48rem)`: the same breakpoint, in the same unit, as the `md:` classes in the sidebar. CSS and JavaScript now always agree on which navigation to show.
- `SIDEBAR_WIDTH` is `min(16rem, 40vw)`. At normal text sizes 16rem is always the smaller value from 48rem up, so nothing changes. With enlarged text the rail stays at 40% of the window, wide enough for every navigation label at 200%; only the user menu's name is shortened, and the menu shows it in full. A third of the window was tried first and cut "Work orders" short.
- The work-order assignee select is `w-full md:max-w-80` (capped, not fixed). `Skeleton` gets `max-w-full`, so loading placeholders can't overflow either.
- The vessel and inspection lists' phone rows wrap their status badge under the title. "In maintenance" and "In progress" ran 31–60px past a 412px phone at a 32px default font.
- `e2e/enlarged-text.spec.ts` covers both ways, on desktop and Pixel 7. With a 32px default font at 412, 1024 and 1360px, and with a 200% root font at 768 and 1024px, it checks 7 pages for sideways scroll and checks that the sidebar's links can be reached. Against the old code it failed for each problem above.

**Consequences:** CONVENTIONS §6 now asks for both ways of enlarging text, rem breakpoints in JavaScript, and `max-w-*` caps instead of fixed rem widths. The sidebar is a shadcn-managed file: a future `shadcn add sidebar --overwrite` must keep `SIDEBAR_WIDTH`'s cap, as it must keep the earlier local changes.

<a id="d-049"></a>

## D-049 — Integration suite: the real Server Actions against the local stack
**Status:** Accepted · 2026-10-16

**Context:**
- The data layer turns database errors into plain-language messages by matching each error's code and text (`explain()` in the `server/mutations.ts` files). 12 of these messages appeared in no test, so rewording an error in a migration would silently show users the generic fallback while every check stayed green.
- D-006 keeps two copies of the status rules (a trigger and a TypeScript table). Only each copy on its own was tested. Inspections had no TypeScript table at all, only a comment.
- Server Actions' role checks and organization handling were covered only indirectly, through E2E and pgTAP.

**Decision:**
- `integration/` holds Vitest tests run by `npm run test:integration` (`vitest.integration.config.mts`). `npm test` stays database-free.
- **What runs for real:** each test runs the real code path: Server Action → data layer → `requireUser` → `createClient` (`@supabase/ssr`) → local Auth and PostgREST, so RLS and the triggers apply. Users sign in as seeded users with the local password. No service key is used.
- **What is stubbed:** only Next's request plumbing. `cookies()` returns an in-memory cookie store per signed-in user, `connection()` does nothing, `revalidatePath` is a spy, and `server-only` resolves to an empty module. `redirect()` stays real, and tests read its target from the `NEXT_REDIRECT` error it throws.
- **Safety:** the config refuses any Supabase URL other than `127.0.0.1` or `localhost`, because this repository is linked to the hosted project. Like E2E, global setup runs `supabase db reset --local` first (`INTEGRATION_SKIP_DB_RESET=1` skips it). It then signs each seeded user in once and passes the session cookies to the tests, which keeps the run far below the local Auth rate limit.
- **Status parity (D-006):** for every pair in the database enum (from the generated `Constants`, so a new status can't slip past), the suite asks the database and compares its answer with `canTransition`. Work orders go through the Server Action. Inspections go straight to the table, because the action only offers start, complete and cancel. Handovers are checked against `canAcknowledge`.
  - `inspections/domain.ts` gains `INSPECTION_STATUSES`, `NEXT_STATUSES` and `canTransition` (unit tested), matching what D-006 describes. The UI keeps its existing checks, so behaviour is unchanged.
- **Also covered:**
  - Every reachable error message, through the action.
  - Each write action as each role, including roles the database refuses after the app's own check passes, such as a technician the work isn't assigned to.
  - Other organizations' IDs, and an `organization_id` or `from_user_id` slipped into a form.
  - Every list and detail read, as a Northwind and a Meridian manager.
  - Sign-in (one message for wrong password and unknown account; `next` kept inside the app) and signed-out access.
- **Local only, for now.** CI's database job starts Postgres alone. Running the suite there would also need Auth and the API, plus that throwaway stack's keys. That will be a separate, reviewed change.

**Alternatives:**
- Mock Supabase in unit tests: this would test the mocks, not the trigger wording or RLS.
- Drive everything through E2E: slower by minutes, and it can't reach most error paths from the UI.
- Use a service-role client to arrange data: this would skip RLS, which is part of what is being tested.

**Consequences:**
- 94 tests, about 40 s with the reset or about 3 s without it.
- Breaking a status table, an error-message match or an acknowledgement message each made the matching test fail (checked once, then reverted).
- Three error branches can't be reached through the actions, so they are not covered:
  - work orders' "Only managers…" `42501`: the app's own check answers first;
  - inspections' `23514` "finding and severity": Zod answers first;
  - the trigger's "needs at least one checklist item": `create_inspection` requires 1–100 checks, and no migration grants deletes on checklist items.
- CONVENTIONS §7 now requires an integration test for every new mutation and every new error-message match.

<a id="d-050"></a>

## D-050 — The landing page also speaks to people who are hiring
**Status:** Accepted · 2026-10-24

**Context:** The owner now wants the landing page (D-046) to showcase Aegir to recruiters and hiring managers as well as to people who run fleets. An Impeccable critique on 2026-10-24 scored the page 21/28, with three P1 issues and three P2 issues (`.impeccable/critique/2026-10-24T03-42-33Z__src-app-page-tsx.md`):
- A recruiter couldn't tell who built it, with what, or how to reach them. The author was only in the © line, the stack was never named, and the Source link was hidden on phones.
- The engineering quality was described but not shown.
- `/login?as=` filled in the email but gave no hint of the password.
- Below about 1370px wide the hero's lit signals ran off the screen.
- The step screenshots rendered the app's text at about 8px.
- A shared link had no preview.

The owner settled the direction in one grilling round:
- refine, not redesign;
- fix all six issues;
- name, title, GitHub and LinkedIn, but no email address;
- a "How it's built" section with a diagram, the stack and one real excerpt;
- close the page with a "Built by" section;
- the password hint on `/login`;
- no counts on the page.

**Decision:**
- **Hero.**
  - Under the role picker: "Built by Johnmark Enriquez, full-stack engineer", with "Read the source" and "how it's built" links.
  - The shared-accounts note and a Copy button for the password sit in the picker itself.
  - The desktop capture crops the app sidebar off, and the text column is 30rem with a 42rem frame until 80rem (34rem and 64rem from there). All three lit signals now stay inside the window from 1024px up, and the signals keep their positions in % of the whole capture.
- **Header.** A "How it's built" section link. On phones, where the section links hide, a ghost "Source" link stays next to Sign in.
- **One failed check, followed.**
  - Each step's words now sit above a full-width screenshot cropped to a band (`crop`, measured per capture), so the app's text renders at about 13px at 1440px.
  - Phones keep the zoomed `focus` crops.
  - Every frame is a link that opens the full-size capture in a new tab: a "Full size" chip, icon-only on the zoomed crops.
- **How it's built** (new, after the trust section):
  - The request path as three stations: browser → Next.js 16 on Vercel → Postgres 17 on Supabase. Each fact is from ARCHITECTURE.md, SECURITY.md or D-039/D-044.
  - One real rule with its test: the work-order transition rule from the latest migration, and the pgTAP assertion that tries open → completed. Both link to their lines on GitHub.
  - The stack, as in the README, plus links to CI, testing, the decision log and architecture.
  - The quote lives in `features/landing/excerpt.ts`. A unit test compares it with the files at the linked lines, so an edit to either file fails `npm test` instead of leaving a stale quote. The migration can't change (append-only); the test file can.
- **Built by** (new, last before the footer): name, title, one sentence on what the project covers, and links to the GitHub profile, the source and the decision log. LinkedIn was added on 2026-10-24. No email address.
- **`/login?as=<role>`** shows "Live demo password: ShipShape2026" with a Copy button under the password field, linked by `aria-describedby`. It never fills the field and never puts it in a URL (D-011). Unknown or unpublished `as` values show nothing. The local seed's password differs, so the hint names the live demo.
- **Link preview.** `src/app/opengraph-image.tsx` renders the hero in miniature at build time: the night field, the promise and the dimmed capture with its three signals lit. Satori takes no OKLCH, so the night tokens are written out in sRGB, and the font is ImageResponse's bundled Geist. `page.tsx` adds Open Graph and Twitter metadata. On Vercel the image URL is made absolute from `VERCEL_PROJECT_PRODUCTION_URL`.
  - The proxy's matcher now skips `/opengraph-image`. Otherwise the signed-out redirect sent crawlers to `/login` (seen in testing).
- **Still true copy only.** No counts, no invented customers. "Built by" makes no claim beyond authorship.

**Not taken:**
- A GitHub Actions badge image. The CSP allows only same-origin images (D-039), so CI is a text link.
- Build-time counts of tests or decisions. The owner kept the no-counts rule; the page links to the evidence instead.
- An email address on the page (owner's choice).
- A full redesign. The night bridge and the one-finding story stayed.
- Re-measured phone crops for steps 3 and 4. Any region with both the subject and its signals is too wide to read on a phone, so those crops keep their signals, and the full-size link carries the rest.

**Consequences:**
- The page is longer (about 7,300px at 1440, from about 5,000), mostly from the readable screenshots and the new sections.
- E2E: the landing spec covers the password hint, the copy button, the hiring visitor's path and the preview image served signed out. The smoke test checks the Built by section and the preview image.
- DESIGN.md (Landing page) and the surface brief record the changes.

<a id="d-051"></a>

## D-051 — The product page is for users and clients; engineering moves to its own page
**Status:** Accepted · 2026-10-24

**Context:** The owner wants to show the landing page to the people who would use Aegir and the clients who would choose it. An Impeccable critique judged through their eyes scored it 19/28, down from 21/28 for recruiters (`.impeccable/critique/2026-10-24T04-48-34Z__src-app-page-tsx.md`). Its findings:
- From the trust section on, the page spoke to engineers: "How it's built" with SQL sat between the proof and the demo, and the page ended on "Built by" and LinkedIn.
- The trust section explained its promises as Postgres mechanisms.
- The header's Sign in led to a bare `/login`.
- Step 1 promised "on deck" but showed a desktop screen.
- The story broke at step 3.
- Nothing said what Aegir replaces or what it doesn't do yet.

The owner settled the direction in one grilling round (8 questions, all accepted).

**Decision:**
- **Two pages.**
  - `/` is the product page.
  - `/engineering` (static, public: added to the proxy's `PUBLIC_PATHS`) carries what D-050 added for engineers and people who are hiring: "How Aegir is built" on the night field, then a new "The promises, and what keeps them" table, the request path, the rule and its test, the stack, the evidence links, and "Built by".
  - The header's section links end with a separated "For engineers", and the footer and the trust section link to it.
- **`/`, in order:**
  1. Hero. The only author line is now "A portfolio project by Johnmark Enriquez, with synthetic data. Not a certified maritime safety system."
  2. One failed check, followed to the fix.
  3. On deck and at the desk (new): four roles, where each works and what Aegir does for them, beside the phone dashboard.
  4. Records you can stand behind, in operators' words: your company's records stay yours; every change is signed and dated; the rules can't be skipped; handovers can't be rewritten.
  5. What it replaces, and what it doesn't do yet (new): the positioning line, what's in this version, and PRODUCT.md's exclusions, plus "examples, not official templates" and not certified.
  6. Try it as each role, with a first task built on each person's own seeded work instead of a repeated password.
  7. Want this for your fleet? (new): the night field again, and one action, "Talk to Johnmark on LinkedIn". It promises a conversation, not a product for sale.
- **Header.** "Try the demo" is the primary button (to the demo section), Sign in a ghost link. The section links show from `lg`.
- **Sign-in.** `/login` gains an "Aegir home" link. With a published `?as=` it says "Signing in as Technician · Tomas Okafor". Without one, it lists the four demo roles. `demoRoleFor` is unit tested.
- **Screenshots.**
  - Two new captures, taken from the local stack (same seed, local password, no sign-ins against the live site):
    - `phone-inspection.png`: Ingrid's fire safety audit on a Pixel 7, with the Fail panel open (nothing saved);
    - `handovers-all.png`: Tomas's handovers, all of them, so the Fjord fuel-pump handover continues the story.
  - Their dates differ by a few days from the hosted-demo captures. The existing captures are untouched.
  - `capture-screenshots.mjs` gained both shots and an `ONLY=` filter.
  - Step 1 uses a new `PhoneFrame`: a phone width, never zoomed, beside its words on wide screens.
  - The audit-log frame shows only the log's half of the capture (`columns`), so it reads at about 14px.
  - The "Full size" hint moved from a chip on the capture to a muted line under each frame, inside the same link. On the capture it covered a badge (bottom right) or the app's own buttons (top right).
- **Link preview.** The words speak to users and clients; the image's bottom line invites them to try the demo as a role.
- **No seed change.** The story's work order stays with Kenji. Changing it would touch 8 test references and need a hosted demo reset; the technician's task uses Tomas's own job instead.

**Not taken:**
- Keeping both audiences on one page with the engineering section lower down. It still cost a quarter of a phone scroll before the call to action.
- Email on the page, and claims of availability or pricing. The close offers a conversation on LinkedIn only.
- Recapturing every screenshot locally. It would have changed the README images.

**Consequences:**
- `/` is about 7,500px at 1440 and 9,650px at 390. The engineering terms now live on `/engineering`.
- E2E covers the sign-in states, the client's path, the engineering page and both pages at 320px with 200% text. axe runs on `/engineering` and `/login?as=technician`. The smoke test checks the close, `/engineering` and seven images.

<a id="d-052"></a>

## D-052 — Keep the hosted database awake, and say when sign-in is down
**Status:** Accepted · 2026-10-24

**Context:** On 2026-10-24 every live sign-in failed with "Invalid email or password."
- The production project's hostname (`lerdmictefgrcmbovlft.supabase.co`) returned NXDOMAIN, while other Supabase hosts resolved.
- The project had gone 8 days without activity (the last live sign-ins were the smoke tests on 2026-10-16), and Supabase pauses Free-plan projects after about 7. Only the owner's dashboard can confirm "paused" rather than "deleted".
- Two things hid the outage:
  - `signIn` reported every Auth error except the rate limit as wrong credentials;
  - the landing-only smoke test never touches the database.

The owner accepted both proposals in a grilling round.

**Decision:**
- **Sign-in messages** (`features/auth/sign-in-error.ts`, unit tested):
  - the rate limit keeps its message;
  - an `AuthRetryableFetchError` (status 0 for no connection, 5xx otherwise) or any 5xx shows "Sign-in isn't available right now. Try again in a few minutes.";
  - everything else shows "Invalid email or password.", so wrong password and unknown account still can't be told apart.
- **Keep-alive.**
  - `vercel.json` schedules Vercel Cron to call `GET /api/keepalive` daily at 06:00 UTC. Hobby allows one run a day, well inside the 7-day window.
  - The route calls `connection()` (request time, never prerendered) and then `pingDatabase()` (`lib/supabase/keepalive.ts`): one anonymous `GET` on `vessels`, limit 1. RLS and the grants refuse it with `42501`. Any SQLSTATE means Postgres ran the request; an empty code means it was never reached. It is a GET because a refused HEAD has no body, so its SQLSTATE would be lost.
  - The route returns `{ ok }` with 200 or 503 and `Cache-Control: no-store`.
- **Public, no secret.** I proposed a `CRON_SECRET` check, but AGENTS.md rule 4 allows only the two public Supabase variables at runtime. So the route is public, reads nothing and reveals only whether the database answered (SECURITY.md §9). `/api/keepalive` joins the proxy's `PUBLIC_PATHS`.
- **Detection.** The smoke test's landing checks call the keep-alive, so a `LANDING_ONLY=1` run now fails when the database is unreachable.

**Not taken:**
- A `CRON_SECRET` header check (rule 4, above).
- A new `public.keepalive()` function granted to `anon`. That is a schema change and an `anon` grant just for this; a refused read already reaches Postgres.
- Upgrading to Supabase Pro. That's the owner's call and a cost; the keep-alive is free.
- A GitHub Actions cron with the publishable key as a CI secret. CI holds no secrets (D-044).

**Consequences:**
- Assumption: Supabase counts a refused API request as activity. Check after the first week that the project stays active (dashboard), and that Vercel lists the job under Settings → Cron Jobs.
- Tests:
  - unit tests cover the message mapping and `reachedDatabase`;
  - an integration test calls the real route signed out against the local stack;
  - E2E checks it is public and uncached;
  - unreachable hosts were checked by hand: postgrest-js gives an empty code, and auth-js gives `AuthRetryableFetchError` with status 0.
