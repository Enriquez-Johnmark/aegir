# Architecture

> Status legend: ✅ implemented · 🟡 in progress · ⬜ planned. Keep this file in sync with the code; update it in the same change that alters a boundary.

## 1. Overview

Aegir is a single **Next.js 16 (App Router)** application backed by **Supabase** (Postgres, Auth). There is no separate API server: Server Components read data, Server Actions mutate it, and **Postgres Row-Level Security is the final authorization boundary**.

```text
 Browser ──HTTPS──▶ Vercel (Next.js 16)
   │                  ├─ src/proxy.ts ............ refreshes Supabase session cookies (not an auth boundary)
   │                  ├─ Server Components ....... call feature DAL (server-only) → Supabase as the user
   │                  └─ Server Actions .......... validate (Zod) → DAL → Supabase as the user
   │                                                     │
   │                                                     ▼
   └────────────── (no direct DB access) ──────▶ Supabase
                                                   ├─ Auth (JWT, cookies via @supabase/ssr)
                                                   ├─ PostgREST Data API (explicit GRANTs only)
                                                   └─ Postgres 17
                                                        ├─ RLS policies on every public table
                                                        ├─ private.* helper functions (membership/role checks)
                                                        ├─ triggers: audit log, state transitions, updated_at
                                                        └─ RPC functions for multi-write transactions
```

## 2. Technology

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 16.4 (App Router, `src/` dir, Cache Components on) | `proxy.ts` replaces `middleware.ts` in Next 16 |
| UI | React 19.3, Tailwind CSS v4, shadcn/ui (`base-nova`, Base UI primitives), lucide icons | |
| Validation | Zod 4 | Shared client/server schemas per feature |
| Auth & DB | Supabase Auth + Postgres 17, `@supabase/ssr` 0.12, `supabase-js` 2.117 | Publishable key only in the app |
| DB tooling | Supabase CLI 2.120 pinned as a devDependency | Run via `npx supabase` / npm scripts |
| Tests | Vitest 5 (unit; integration against the local stack, D-049), pgTAP via `supabase test db` (RLS, constraints, triggers), Playwright 1.64 (E2E) | |
| Hosting | Vercel + Supabase Cloud ✅ (2026-10-15, see DEPLOYMENT.md) | |

## 3. Project folder layout

We follow Next.js's documented **"store project files outside of `app`"** strategy combined with **feature folders**: `src/app` contains routing only; business logic lives in `src/features/<feature>`; shared infrastructure lives in `src/lib`.

```text
aegir/
├── .github/workflows/ci.yml     # CI: app checks and database checks on every push (D-044)
├── vercel.json                  # Vercel Cron: GET /api/keepalive daily at 06:00 UTC (D-052)
├── .claude/skills/              # Project-local Claude Code skills (see docs/AGENT-SKILLS.md)
├── docs/                        # All project documentation (this folder)
├── integration/                 # ✅ Vitest: real Server Actions and data layer against the LOCAL stack, as seeded users (D-049)
├── e2e/                         # ✅ Playwright specs per feature + accessibility (axe) + security headers; global-setup resets the LOCAL db
├── public/                      # Static assets served as-is
├── scripts/                     # ✅ demo-seed.mjs and demo-reset.mjs (+ tests): hosted demo seed and reset from supabase/seed.sql (D-011, D-043); capture-screenshots.mjs (README and landing images; `ONLY=` limits a run to named files); smoke.mjs (read-only smoke test of a deployed site)
├── supabase/
│   ├── config.toml              # Local Supabase stack configuration (committed)
│   ├── migrations/              # ✅ Timestamped, append-only SQL migrations (source of truth)
│   ├── seed.sql                 # ✅ Synthetic demo data + test fixture IDs (local only)
│   └── tests/                   # ✅ pgTAP database tests: constraints, RLS, triggers
├── src/
│   ├── proxy.ts                 # ✅ Session refresh + optimistic redirects (Next 16 "proxy", formerly middleware); skips static assets and /opengraph-image
│   ├── app/                     # ROUTING ONLY: layouts, pages, loading/error/not-found
│   │   ├── layout.tsx           # ✅ Root layout (fonts, metadata)
│   │   ├── page.tsx             # ✅ Public product page, for users and clients (static; composes features/landing, D-046, D-051)
│   │   ├── engineering/page.tsx # ✅ Public engineering page: guarantees, request path, rule and test, stack, author (static, D-051)
│   │   ├── api/keepalive/route.ts # ✅ Public GET for Vercel Cron: one anonymous read so the hosted database isn't paused (D-052)
│   │   ├── opengraph-image.tsx  # ✅ Link-preview image, generated at build time; the proxy skips it so crawlers get it signed out (D-050)
│   │   ├── (auth)/              # ✅ Route group: centred auth layout (no URL segment)
│   │   │   ├── login/page.tsx   # ✅ Sign-in (searchParams read inside <Suspense>)
│   │   │   └── no-access/page.tsx # ✅ Signed in but no organization membership
│   │   └── (app)/               # ✅ Route group: authenticated shell (sidebar layout)
│   │       ├── layout.tsx       # ✅ Static shell; user menu streams in behind <Suspense>
│   │       ├── dashboard/page.tsx # ✅ Live figures + queues (M3 slice 4, D-035)
│   │       ├── vessels/{page.tsx, new/, [vesselId]/, [vesselId]/edit/}  # ✅ M3 slice 1
│   │       ├── error.tsx        # ✅ Recoverable error boundary for the app shell
│   │       ├── inspections/{page.tsx, new/, [inspectionId]/}  # ✅ M3 slice 2
│   │       ├── work-orders/{page.tsx, new/, [workOrderId]/, [workOrderId]/edit/}  # ✅ M3 slice 3
│   │       ├── handovers/{page.tsx, new/, [handoverId]/}  # ✅ M3 slice 5
│   │       └── audit/page.tsx   # ✅ M3 slice 6: organization-wide audit log (D-042)
│   ├── features/                # ✅ One folder per business capability (auth ✅, vessels ✅, inspections ✅, work-orders ✅, dashboard ✅, handovers ✅, audit ✅, landing ✅: the public pages' sections, no server code)
│   │   └── <feature>/           #    e.g. vessels, inspections, work-orders, handovers, audit, dashboard
│   │       ├── components/      #    Feature UI (Server Components by default; "use client" only when needed)
│   │       ├── server/
│   │       │   ├── queries.ts   #    import "server-only"; reads → DTOs (Data Access Layer)
│   │       │   └── mutations.ts #    import "server-only"; writes; authz + Supabase calls
│   │       ├── actions.ts       #    "use server"; thin: parse FormData → Zod → mutations → revalidate
│   │       ├── schemas.ts       #    Zod schemas shared by forms and actions
│   │       ├── domain.ts        #    Pure business rules (e.g. status transitions); no I/O
│   │       └── *.test.ts        #    Colocated unit tests
│   ├── components/
│   │   ├── ui/                  # shadcn/ui generated components (managed by the shadcn CLI)
│   │   ├── layout/              # ✅ App shell: app-sidebar.tsx, user-menu.tsx, page-header.tsx
│   │   └── shared/              # ✅ button-link, forbidden-state, saved-notice, panel (EMPTY_PANEL), url-filters (D-033), wrapping-select
│   ├── lib/
│   │   ├── env.ts               # ✅ Zod-validated public env
│   │   ├── utils.ts             # ✅ cn() helper (shadcn)
│   │   ├── format.ts            # ✅ Dates (UTC), date-times, numbers
│   │   ├── supabase/
│   │   │   ├── client.ts        # ✅ Browser client (currently unused; using it needs a CSP connect-src change, D-039)
│   │   │   ├── cookie-options.ts # ✅ httpOnly session cookies, Secure on Vercel (D-043)
│   │   │   ├── server.ts        # ✅ Server client (server-only, per request, RLS)
│   │   │   ├── keepalive.ts     # ✅ pingDatabase(): one anonymous read; any SQLSTATE means Postgres answered (D-052)
│   │   │   └── proxy.ts         # ✅ updateSession() used by src/proxy.ts; public paths: /, /engineering, /login, /api/keepalive
│   │   ├── auth/session.ts      # ✅ getSessionState() (React.cache) / requireUser(), server-only
│   │   ├── auth/roles.ts        # ✅ Role labels + UI capability map (DB is authoritative)
│   │   ├── safe-redirect.ts     # ✅ Open-redirect-safe `next` handling
│   │   └── security-headers.ts  # ✅ CSP + security headers, applied in next.config.ts (D-039)
│   ├── hooks/                   # ✅ use-mobile.ts (useSyncExternalStore media query)
│   └── types/
│       └── database.types.ts    # ✅ Generated by `npm run db:types`. Never hand-edit
├── .env.example                 # ✅ Placeholder env vars (real values in .env.local, git-ignored)
├── AGENTS.md / CLAUDE.md        # Agent instructions (CLAUDE.md imports AGENTS.md)
├── DESIGN.md                    # ✅ Design system "The Bridge Console" (tokens in src/app/globals.css)
├── .impeccable/                 # ✅ Impeccable config (shared), design.json sidecar and critique/ snapshots (committed); local files git-ignored
└── components.json              # shadcn/ui configuration
```

### Why this layout

- **`app/` is routing only.** Pages compose feature components; they do not contain queries. This keeps the route tree readable and makes data access auditable in one place per feature.
- **Feature folders over type folders.** Everything about "work orders" (schema, rules, queries, actions, UI) changes together, so it lives together.
- **`server/` sub-folder plus `import "server-only"`.** Any accidental import from a Client Component becomes a build error, so database access can't leak into the browser bundle.
- **No barrel files (`index.ts` re-exports).** Import concrete modules directly. Barrels hurt tree-shaking and blur the server/client boundary (Vercel React rule `bundle-barrel-imports`).
- **Route groups `(auth)` and `(app)`** give unauthenticated and authenticated pages different layouts without changing URLs.

## 4. Server/client boundaries

| Code | Runs on | May import | Must not |
|---|---|---|---|
| `src/app/**/page.tsx`, `layout.tsx` | Server | feature components, `server/queries.ts` | Contain inline SQL/Supabase calls |
| `features/*/server/*` | Server only (`server-only`) | `@/lib/supabase/server`, `@/lib/auth/*` | Be imported by `"use client"` files |
| `features/*/actions.ts` | Server (`"use server"`) | `schemas.ts`, `server/mutations.ts` | Trust any argument; return raw DB rows |
| `features/*/components/*` | Server by default | DTO types, `schemas.ts`, `domain.ts` | Mark `"use client"` without needing state, effects or events |
| `features/*/schemas.ts`, `domain.ts` | Both | `zod`, pure TS | Import server modules or I/O |
| `src/lib/supabase/client.ts` | Browser | `@/lib/env` | Be used for privileged operations |

## 5. Data flow

**Read:** `page.tsx` renders a feature component inside `<Suspense>` → component awaits `features/x/server/queries.ts` → query resolves the current user (`requireUser()` over `getSessionState()`, wrapped in `React.cache`, verified with `supabase.auth.getClaims()`) → Supabase query **as that user** → RLS filters rows → query maps rows to a minimal DTO → component renders.

**Write:** form (shadcn `Field` components, client-side Zod for UX) → Server Action → `schema.safeParse(formData)` → `server/mutations.ts` re-verifies the session and role → Supabase insert/update **as the user**, or an RPC for multi-row transactions → Postgres constraints, transition triggers and RLS enforce the invariants → audit trigger records the event → action calls `revalidatePath` and returns a small typed state (`{ values?, fieldErrors?, formError? }`) or redirects, never the raw row.

## 6. Trust boundaries

1. **Browser → Next.js:** everything from the client is untrusted: FormData, params, searchParams and hidden fields such as `organization_id`. Re-validate on the server.
2. **Next.js → Supabase:** the app uses the **publishable key + the user's JWT**. It never holds the secret/service-role key at runtime. A bug in the app therefore cannot exceed the user's RLS rights.
3. **Postgres:** RLS, constraints and triggers are authoritative. App-level checks exist for UX and defence in depth, not as the only guard.
4. **Privileged code:** `security definer` functions live in the unexposed `private` schema, use `set search_path = ''`, have `EXECUTE` revoked from `public`/`anon`, and check `auth.uid()` in the body.

## 7. Rendering and caching (Cache Components)

`cacheComponents: true` is on (Next 16.4 default). Consequences:

- Reading cookies (the session) is request-time data and **must sit inside a `<Suspense>` boundary**; otherwise the build fails. The `(app)/layout.tsx` shell stays static, and session-dependent UI (user menu, page data) streams in behind boundaries with skeleton fallbacks (`Skeleton` component).
- **Organization data is not cached on the server with `use cache`** in the MVP. Those queries depend on the user's JWT and RLS. A server cache keyed incorrectly could serve one user's rows to another. Per-request deduplication uses `React.cache()`. See [DECISIONS.md](DECISIONS.md#d-007).
- Mutations call `revalidatePath` for the affected routes.

## 8. Feature boundaries (MVP)

| Feature | Owns tables | Depends on |
|---|---|---|
| auth / organizations | `organizations`, `profiles`, `memberships` | Supabase Auth |
| vessels | `vessels` | organizations |
| inspections | `inspections`, `inspection_items` | vessels, profiles |
| work-orders | `work_orders` | vessels, inspection_items, profiles |
| handovers | `handovers` | vessels, work_orders, profiles |
| audit | `audit_events` (written by triggers only; read by the log and every record's History card, D-042) | all of the above |
| dashboard | none (read-only aggregates) | all of the above |

See [DATA_MODEL.md](DATA_MODEL.md) for tables and [SECURITY.md](SECURITY.md) for the permission matrix.
