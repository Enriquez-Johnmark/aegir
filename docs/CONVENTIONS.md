# Engineering Conventions

The working rules for Aegir code. They combine the official Next.js and Supabase documentation (checked 2026-10-12 against Next.js 16.4 and the Supabase docs/changelog) with the project skills in `.claude/skills/` (AGENT-SKILLS.md). When a rule here conflicts with a skill, this file wins, and the reason is in [DECISIONS.md](DECISIONS.md).

Folder layout and boundaries: see [ARCHITECTURE.md](ARCHITECTURE.md#3-project-folder-layout).

---

## 1. General TypeScript

- `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride` are on. Do not weaken them; fix the type.
- No `any`. Use `unknown` plus narrowing (usually a Zod parse).
- No non-null assertions (`!`) on external data (env, DB rows, params). Validate instead.
- Database row types come from the generated `src/types/database.types.ts`. Never hand-write table types.
- Naming: files `kebab-case.ts(x)`; React components `PascalCase`; functions and variables `camelCase`; DB identifiers `snake_case`.
- Import with the `@/` alias. **No barrel files** (`index.ts` that only re-exports).
- Pin dependencies exactly (`.npmrc` has `save-exact=true`) and commit `package-lock.json`.

## 2. Next.js (App Router, v16)

### Routing and files
- `src/app` is for routing files only: `page`, `layout`, `loading`, `error`, `not-found`, `route`. Business logic goes in `src/features/*`.
- Use **route groups** `(auth)` and `(app)` for different layouts, and **dynamic segments** named after the entity (`[vesselId]`).
- Pages stream their data sections behind `<Suspense>` with `Skeleton` fallbacks (no `loading.tsx` files; ARCHITECTURE §7). The `(app)` group has one `error.tsx` (recoverable error UI). Add `not-found.tsx` where `notFound()` is used.
- Next 16 renamed middleware to **`proxy.ts`** (`export function proxy`). We use it to refresh Supabase cookies and to redirect optimistically (signed out → `/login`); it is never the authorization boundary (SECURITY.md §1).

### Server and Client Components
- **Server Components by default.** Add `"use client"` only for state, effects, event handlers or browser APIs, and push it to the smallest leaf component.
- Pass Client Components **minimal, serialisable props** (DTOs), never whole DB rows (`server-serialization`).
- Any module touching the database, secrets or session imports **`"server-only"`**.
- Don't define components inside components (`rerender-no-inline-components`).
- Derive state during render; don't sync derived state with effects (`rerender-derived-state-no-effect`).

### Data fetching (Data Access Layer)
- New-project recommendation from the Next.js data-security guide: a **Data Access Layer**. In Aegir that is `features/*/server/queries.ts` and `mutations.ts`.
- DAL functions verify the user themselves (they don't trust the caller) and return **DTOs** containing only the fields the UI needs.
- Start independent fetches together with `Promise.all` (`async-parallel`). Avoid request waterfalls.
- Wrap per-request helpers in `React.cache()` so they run once per request (`server-cache-react`), as `getSessionState()` is (`requireUser()` builds on it, `src/lib/auth/session.ts`).
- Stream slow sections with `<Suspense>` (`async-suspense-boundaries`).

### Cache Components (enabled)
- Session and cookie reads must be inside a `<Suspense>` boundary. Keep them out of the top level of layouts so the shell can prerender.
- **Do not use `"use cache"` on organization data** (RLS- and user-dependent) in the MVP. If added later, key the cache on verified `organization_id` and user, keep the cached function unexported, and document it in DECISIONS.md.
- Never put secrets or emails into cache keys or `cacheTag` values (stored in plain text).

### Server Actions
Server Actions are **public POST endpoints**: a page-level auth check does not protect the actions it renders. Every action must:
1. Re-verify the session inside the action or in the DAL it calls (`server-auth-actions`).
2. Parse input with Zod (`safeParse`) and return field errors, without throwing for validation failures.
3. Treat `organization_id`, `role`, `created_by` and similar fields from the client as **untrusted**. Derive them server-side or let the database enforce them.
4. Delegate to `server/mutations.ts`. Keep the action thin.
5. Return a small typed state (`{ values?, fieldErrors?, formError? }` for forms, `{ error? }` for buttons) or `redirect()`, never raw rows.
6. Call `revalidatePath()` for affected views. When a record feeds other screens (inspections feed the vessel watch list and the dashboard), revalidate the app-shell layout (`revalidatePath("/", "layout")`, D-033).
7. Never run mutations as side effects of rendering (GET); always use an action (POST).

### Environment variables
- Only `NEXT_PUBLIC_*` reaches the browser. The only ones allowed are `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- All env access goes through `src/lib/env.ts` (validated with Zod, fails fast).
- **The Supabase secret / service-role key is never read by app runtime code.** Seed and test scripts only.

## 3. Supabase (platform and client)

- Use **`@supabase/ssr`**: `createBrowserClient` in the browser and `createServerClient` on the server, both with the **publishable key**.
- **Create a new server client per request.** Never store one in module scope.
- **Protect pages and data with `supabase.auth.getClaims()`**, which verifies the JWT. **Never trust `getSession()` on the server**, because it is not revalidated. Use `getUser()` only when fresh user-record data is needed.
- In `updateSession` (`src/lib/supabase/proxy.ts`), run no code between `createServerClient` and `getClaims()`, and return the `supabaseResponse` object unchanged. A redirect from the proxy must copy the refreshed auth cookies onto the redirect response.
- Session helpers that read the user call `await connection()` first: authentication is per request and must never be prerendered or runtime-prefetched.
- Sign out with `signOut({ scope: "local" })`, never the global default (D-020).
- **Authorization data never comes from `user_metadata`**, which users can edit. Roles live in the `memberships` table and are read via RLS helper functions.
- **Data API exposure is explicit.** New tables are no longer auto-exposed: opt-in now, enforced on all projects from 2026-10-30. Every migration that creates a table includes explicit `GRANT`s to `authenticated` (never `anon` for organization data) **and** enables RLS in the same migration.
- Multi-row writes that must be atomic (for example an inspection plus its checklist items) go through a **Postgres function called with `.rpc()`**, because supabase-js has no client-side transactions.
- List filters live in the URL through `useUrlFilters()` / `FilterSelect` (`src/components/shared/url-filters.tsx`); don't hand-roll router updates per list. `ALL` is a reserved token (`"__all__"`), never a real option value; `FilterSelect` shows only known values and falls back to its first option, so **list the default option first**. Select triggers whose value can grow use `WRAPPING_SELECT_TRIGGER`.
- Filters read from the URL are untrusted: validate them with Zod (`.catch(undefined)` for unknown values) and sanitise free text before it is interpolated into a PostgREST filter expression such as `.or()` (letters, digits, spaces, `'` and `-` only).
- Check `{ error }` on every Supabase call. Map Postgres error codes (`23505` unique, `23514` check, `42501` RLS/permission, `P0001` raised by our triggers) to user-friendly messages in the DAL.
- Re-generate types after every migration: `npm run db:types`.
- Before implementing any Supabase feature, check the [changelog](https://supabase.com/changelog.md) for breaking changes and the current docs, as the `supabase` skill requires.

## 4. Database and migrations (Postgres)

### Migration workflow (imperative migrations)
1. `npx supabase migration new <descriptive_name>`. Never invent a filename or timestamp by hand.
2. Write the SQL. Iterating locally is fine: `npm run db:reset` rebuilds the **local** DB from migrations plus seed.
3. Validate: `npm run db:reset`, `npm run db:lint`, `npm run db:test`, then `npx supabase db advisors` (security and performance advisors).
4. `npm run db:types`, then update DATA_MODEL.md, FILE-CHANGE-LOG.md and CHANGELOG.md.
5. **Once a migration has been pushed to any shared or remote DB it is immutable.** Fix forward with a new migration.
6. Never make schema changes in the dashboard. Never run `db reset` against a linked or remote project.

### Schema rules
- Identifiers: lowercase `snake_case`; **plural** table names; FK columns `<singular>_id`.
- Every table: `id` primary key, `created_at timestamptz not null default now()`. Mutable tables also get `updated_at timestamptz not null default now()`, maintained by a trigger.
- Every organization-owned table has `organization_id uuid not null` and an index on it.
- **Cross-table organization consistency:** child tables reference parents with **composite foreign keys** `(parent_id, organization_id) → parent(id, organization_id)`, so a row can never point at another organization's record.
- **Index every foreign key column.** Postgres does not do it automatically (`schema-foreign-key-indexes`).
- Types: `text` (not `varchar(n)`), `timestamptz` (never `timestamp`), `date` for calendar dates, `bigint`/`integer` as appropriate, `boolean` for flags, `numeric` for exact values.
- Enumerated states use Postgres `enum` types (see D-005); add values with a forward migration.
- Express invariants as **constraints** (`not null`, `check`, `unique`, FK) rather than only in app code.
- **Grants are column-level** for INSERT/UPDATE: grant only the columns clients may write. Server-owned columns (`organization_id` after insert, `created_by`, `from_user_id`, `completed_at`, IDs) get no grant and are set by triggers (D-017). Every table migration starts with `revoke all on <table> from anon, authenticated;`.
- **Deletion:** FKs to historical records use `on delete restrict`. Safety records are never hard-deleted by users (no DELETE policy). Vessels are retired via status.
- PostgreSQL has no `ADD CONSTRAINT IF NOT EXISTS`. In migrations that alter existing tables, guard with a `DO` block or rely on migration ordering.

### Functions and triggers
- Default to `security invoker`. Use `security definer` only for narrow lookups that must bypass RLS (membership checks, audit writes), and then:
  - put the function in the **`private` schema** (not exposed by the Data API);
  - `set search_path = ''` and fully qualify every identifier (`public.memberships`);
  - `revoke execute ... from public, anon` and grant only what is needed;
  - check `auth.uid()` inside the body where relevant.
- Never add `security definer` just to get rid of a permission error.
- Views use `with (security_invoker = true)`.

## 5. Row-Level Security

- **RLS is enabled on every table in `public`**, in the same migration that creates the table.
- Policies are **per operation** (`select`, `insert`, `update`, `delete`) and always specify **`to authenticated`**. Never use the deprecated `auth.role()`.
- `to authenticated` alone is authentication, not authorization (IDOR). Every policy also has an organization or role predicate.
- Organization checks use the set-returning helpers as an **uncorrelated** subquery: `organization_id in (select private.my_org_ids())` or `organization_id in (select private.my_org_ids_with_role(array['admin','manager']::public.org_role[]))`. Wrap direct auth calls too: `(select auth.uid())` (D-016).
- **UPDATE policies need both `using` and `with check`**, and UPDATE also needs a SELECT policy, or updates silently affect 0 rows.
- Policy naming: `"<table>: <operation> <who>"`, e.g. `"vessels: update managers"`.
- No DELETE policy means users cannot delete rows. That is intentional for safety records.
- Every policy has pgTAP tests covering the allowed role, a disallowed role in the same organization and a user from another organization; anon is covered globally by the privilege checks in `01_tenancy` (no table privileges, no `private` execute). See [TESTING.md](TESTING.md).

## 6. UI (shadcn/ui, Tailwind v4)

Project config: `base-nova` style, **Base UI** primitives (`base`), lucide icons, CSS variables in `src/app/globals.css`.

- Use existing shadcn components before custom markup (`npx shadcn@4.21.4 search`, `docs <component>`). Read every component after `add`.
- Use **semantic tokens** (`bg-background`, `text-muted-foreground`, `bg-destructive`), never raw palette colours such as `bg-blue-500`, and no manual `dark:` colour overrides.
- Layout spacing with `flex`/`grid` + `gap-*` (no `space-y-*`). Use `size-*` for equal width and height. Use `cn()` for conditional classes.
- Forms: `FieldGroup` + `Field` + `FieldLabel` + `FieldDescription`/error; mark validation errors with `data-invalid` on `Field` and `aria-invalid` on the control.
- Status values use `Badge` variants. Empty states use `Empty`, loading uses `Skeleton`, callouts use `Alert`, destructive confirmations use `AlertDialog`.
- Dialog, Sheet and Drawer always have a Title (use `sr-only` if visually hidden).
- Icons in buttons use `data-icon="inline-start|inline-end"` and no sizing classes.
- Base UI uses the **`render` prop** for custom triggers, not `asChild`.
- **Links that look like buttons use `ButtonLink`** (`src/components/shared/button-link.tsx`: a real `<Link>` styled with `buttonVariants`). Never render a link through `Button` (`render={<Link />}` + `nativeButton={false}`): Base UI then adds `role="button"`, so screen readers announce a button that navigates (D-027; this replaced earlier guidance in this file).
- Base UI state attributes are `data-vertical`, `data-horizontal`, `data-active`, … (Tailwind `data-vertical:h-4`), **not** Radix's `data-[orientation=vertical]`. Radix-style selectors copied from examples silently do nothing.
- Every new interactive control honours the 44px coarse-pointer minimum (`pointer-coarse:min-h-11`; DESIGN.md: The Deck Hand Rule).
- Layouts that must survive enlarged text (lists, filter bars, figure rows) switch on **container queries in rem** (`@container` + `@xs:` / `@3xl:` / `@4xl:`), not viewport breakpoints: `html { font-size: 200% }` doesn't change `md:`, but it does change a rem container query. Never `truncate` a record title; let it wrap (WCAG 1.4.4). Check new screens at 200% text.
- `Alert` forces its icon to `text-current` (`*:[svg]:text-current`), so a tint on the icon itself is silently ignored. Tint an alert's icon from the `Alert`: `className="*:[svg]:text-warning"` (`cn` merges it over the default).
- Card titles that name a section of a record are headings: `<CardTitle><h2>…</h2></CardTitle>` (`CardTitle` renders a `div`).
- Empty, forbidden and error states use `EMPTY_PANEL` (`src/components/shared/panel.ts`); record pages use `PageHeader` with `breadcrumbs` and a `badge` outside the `h1`.
- Forms move focus to the first invalid field after a failed submit, keep field hints visible alongside errors, and redirect with `?saved=…` so the record page shows a `SavedNotice`.
- Visual rules live in [DESIGN.md](../DESIGN.md) ("The Bridge Console"). Status uses `Badge` variants `destructive | warning | success | info | outline` with the mapping in DESIGN.md; numbers in tables and metrics use `tabular-nums`.
- Accessibility: semantic HTML landmarks (`header`, `nav`, `main`), visible focus states, labelled controls, keyboard-reachable actions, and colour never the only signal.
- No dead buttons: if a feature isn't implemented, the control doesn't render.

### UX review with Impeccable (`.claude/skills/impeccable`)
- App screens are Impeccable **Operate** mode: clarity, scanability and consistency first; brand lives in precise details. The landing page is **Persuade** mode (D-024).
- After building each UI slice, run `/impeccable critique <route>` (UX heuristics) and `/impeccable audit <route>` (a11y, performance, responsive), fix what they find in the same slice, then `/impeccable polish` before marking it done.
- Use `harden` for loading, empty, error and permission states; `clarify` for labels, validation and error copy; `adapt` for mobile layouts.
- shadcn rules above win on component structure and tokens; Impeccable must not introduce raw colours, custom primitives or decorative motion on operational screens.
- Engine, `hooks on` and `live` mode are opt-in (owner approval; D-024).

## 7. Testing conventions

See [TESTING.md](TESTING.md). In short: pure domain rules get unit tests; every migration with RLS gets pgTAP tests; critical flows get Playwright tests. A green build is not evidence of correctness.

## 8. Change management

- Every meaningful file create, update, delete, move or rename goes in [FILE-CHANGE-LOG.md](FILE-CHANGE-LOG.md). Every coherent change goes in [CHANGELOG.md](CHANGELOG.md).
- Small commits, one concern each, using Conventional Commit prefixes: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`, `db:` for migrations.
- Before committing, reconcile `git status` and `git diff` with the ledger.
