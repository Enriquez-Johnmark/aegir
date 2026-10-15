# File Change Log

A file-level ledger of intentional operations. Git is the authoritative record of *what* changed; this explains *why*. Append new entries at the bottom. Never rewrite history; record reversals as new entries. Build output, caches, `node_modules/`, `.env.local` and `supabase/.temp/` are excluded.

Verification key: ✅ verified (check named) · ⚠️ partially verified · ⬜ not verified

---

## 2026-10-12 · M0: Repository reconnaissance and project skills

| Action | Path | Purpose | Related | Verification |
|---|---|---|---|---|
| CREATE | `.claude/skills/supabase/**` (SKILL.md, CHANGELOG.md, references/, assets/) | Project-local Supabase platform skill (copied, not symlinked) | D-014, AGENT-SKILLS | ✅ files present, no symlinks, discovered by Claude Code |
| CREATE | `.claude/skills/supabase-postgres-best-practices/**` (SKILL.md, CHANGELOG.md, references/) | Postgres/RLS best-practice skill | AGENT-SKILLS | ✅ same |
| CREATE | `.claude/skills/vercel-react-best-practices/**` (SKILL.md, AGENTS.md, README.md, rules/) | React/Next.js performance skill | AGENT-SKILLS | ✅ same |
| CREATE | `.claude/skills/shadcn/**` (SKILL.md, *.md, rules/, scripts/, assets/, agents/, evals/) | shadcn/ui skill | D-014, AGENT-SKILLS | ✅ same; script reviewed |
| CREATE | `skills-lock.json` | Skill sources and content hashes (written by the `skills` CLI) | AGENT-SKILLS | ✅ inspected |

(136 files under `.claude/skills/` in total. Global skill directories were confirmed unchanged.)

## 2026-10-12 · M1: Foundation scaffold

Scaffolded with `create-next-app@16.4.0` in a scratch directory (it refuses non-empty folders) and copied in **without** its demo assets (`public/*.svg`), its boilerplate README, or its generated `next-env.d.ts`.

| Action | Path | Purpose | Related | Verification |
|---|---|---|---|---|
| CREATE | `package.json`, `package-lock.json` | Dependencies (exact versions) and npm scripts (`typecheck`, `test`, `db:*`) | D-003, D-013 | ✅ `npm ci`, all scripts run |
| CREATE | `.npmrc`, `.nvmrc` | `save-exact`, `engine-strict`; Node 24 | D-013 | ✅ |
| CREATE | `tsconfig.json` | Strict TS + `noUncheckedIndexedAccess`, `noImplicitOverride`; `@/*` → `src/*` | CONVENTIONS §1 | ✅ `npm run typecheck` |
| CREATE | `eslint.config.mjs` | Next core-web-vitals + TypeScript lint rules (scaffold default) | | ✅ `npm run lint` |
| CREATE | `next.config.ts` | Cache Components, partial prefetching, Tailwind turbopack loader (scaffold default) | D-007 | ✅ `npm run build` |
| CREATE | `.gitignore` | Scaffold ignores + `!.env.example` + Playwright outputs | SECURITY §4 | ✅ `git check-ignore .env.local` |
| CREATE | `src/app/layout.tsx` | Root layout: Aegir metadata (title template), Geist fonts | | ✅ build + smoke (`<title>Aegir</title>`) |
| CREATE | `src/app/page.tsx` | Public landing (no dead controls) | | ✅ smoke `/` → 200 |
| CREATE | `src/app/globals.css` | Tailwind v4 + shadcn tokens; fixed self-referencing `--font-sans` → `--font-geist-sans` | D-012 | ✅ build |
| CREATE | `src/app/favicon.ico` | Scaffold favicon (placeholder) | | ⬜ to be replaced with Aegir icon |
| CREATE | `components.json`, `src/lib/utils.ts` | shadcn/ui config (base-nova, Base UI, lucide) and `cn()` | D-012 | ✅ `shadcn info` |
| CREATE | `src/lib/env.ts` | Zod-validated public env (fail fast, browser-safe vars only) | D-002 | ✅ unit tests |
| CREATE | `src/lib/env.test.ts` | Env validation unit tests (3) | TESTING | ✅ `npm test` 3/3 |
| CREATE | `vitest.config.ts` | Vitest config: `@` alias, placeholder env for unit tests | TESTING | ✅ `npm test` |
| CREATE | `src/lib/supabase/client.ts` | Browser Supabase client (publishable key) | D-002 | ✅ typecheck/build |
| CREATE | `src/lib/supabase/server.ts` | Server Supabase client (`server-only`, per request) | D-002 | ✅ typecheck/build |
| CREATE | `src/lib/supabase/proxy.ts` | `updateSession()`: cookie refresh via `getClaims()` | D-002 | ✅ smoke: no proxy errors |
| CREATE | `src/proxy.ts` | Next 16 proxy entry (session refresh only, not authz) | ARCHITECTURE §6 | ✅ build lists "Proxy" |
| CREATE | `.env.example` | Placeholder env vars, no secrets | SECURITY §4 | ✅ reviewed |
| CREATE | `supabase/config.toml` | Local stack config; sign-up disabled, password policy hardened | D-015 | ✅ `supabase start` |
| CREATE | `supabase/.gitignore` | CLI default ignores (`.temp`, `.branches`, env files) | | ✅ |
| CREATE | `supabase/seed.sql` | Seed placeholder (header only; data in M2) | DATA_MODEL | ✅ applied during `supabase start` |

## 2026-10-12 · M1: Documentation

| Action | Path | Purpose | Related | Verification |
|---|---|---|---|---|
| CREATE | `README.md` | Project overview, setup, workflows, doc index, limitations | | ✅ reviewed |
| CREATE | `AGENTS.md` | Agent working rules + managed Next.js agent block | | ✅ reviewed |
| CREATE | `CLAUDE.md` | Imports `AGENTS.md` so Claude Code loads the same rules | | ✅ |
| CREATE | `docs/PRODUCT.md` | Users, goals, workflows, scope, exclusions | | ✅ |
| CREATE | `docs/ARCHITECTURE.md` | System design, folder layout, boundaries, data flow, caching | D-001, D-007 | ✅ |
| CREATE | `docs/CONVENTIONS.md` | Next.js, Supabase, Postgres, RLS, UI best practices | | ✅ |
| CREATE | `docs/DATA_MODEL.md` | Target schema (design; not yet migrated) | D-004–D-006 | ⚠️ design only |
| CREATE | `docs/SECURITY.md` | Auth, role matrix, RLS design, secrets, test plan | D-009, D-010 | ⚠️ design only |
| CREATE | `docs/TESTING.md` | Strategy, commands, results log | | ✅ results recorded |
| CREATE | `docs/DEPLOYMENT.md` | Planned deployment and recovery procedure | | ⬜ not executed |
| CREATE | `docs/DECISIONS.md` | ADRs D-001 – D-015 | | ✅ |
| CREATE | `docs/ROADMAP.md` | Milestones, acceptance criteria, deadline risk | | ✅ |
| CREATE | `docs/CHANGELOG.md` | Change history | | ✅ |
| CREATE | `docs/FILE-CHANGE-LOG.md` | This ledger | | ✅ reconciled with `git status` |
| CREATE | `docs/AGENT-SKILLS.md` | Skill sources, commits, verification, conflicts | | ✅ |

## 2026-10-12 · M2: Database schema, RLS and tests

Migrations were created with `npx supabase migration new` and revised only while local-only (never pushed), per the migration policy: composite FK indexes after `db advisors`, and an accurate "not found" error in the work-order trigger after a failing pgTAP test.

| Action | Path | Purpose | Related | Verification |
|---|---|---|---|---|
| CREATE | `supabase/migrations/20261012070232_create_tenancy.sql` | Default-privilege hardening, `private` schema, organizations, profiles, memberships, RLS helpers | D-009, D-016, D-022 | ✅ `db reset`, pgTAP 01 |
| CREATE | `supabase/migrations/20261012070234_create_vessels.sql` | Vessels, IMO check-digit validation, column grants, RLS | D-017 | ✅ pgTAP 02 |
| CREATE | `supabase/migrations/20261012070235_create_inspections.sql` | Inspections, checklist items, transition/freeze triggers, `create_inspection` RPC | D-006 | ✅ pgTAP 03 |
| CREATE | `supabase/migrations/20261012070237_create_work_orders.sql` | Work orders, transitions, assignee-only status changes, follow-up integrity | D-006 | ✅ pgTAP 04 |
| CREATE | `supabase/migrations/20261012070238_create_handovers.sql` | Immutable handovers, recipient acknowledgement | | ✅ pgTAP 05 |
| CREATE | `supabase/migrations/20261012070240_create_audit_log.sql` | Append-only audit log + triggers | | ✅ pgTAP 06 |
| CREATE | `supabase/tests/01_tenancy.test.sql` … `06_audit.test.sql` (6 files) | 73 pgTAP tests: RLS isolation, role limits, rules, audit | TESTING | ✅ 73/73 |
| UPDATE | `supabase/seed.sql` | Synthetic demo data (2 orgs, 8 users, fleet) + fixture contract | D-011, D-018 | ✅ `db reset`; sign-in via API |
| UPDATE | `supabase/config.toml` | Re-enable email provider (`[auth.email] enable_signup = true`); sign-ups stay disabled globally | D-015 correction | ✅ login 200; signup `signup_disabled` |
| CREATE | `src/types/database.types.ts` | Generated DB types (`npm run db:types`) | | ✅ typecheck |

## 2026-10-12 · M2: Authentication and app shell

| Action | Path | Purpose | Related | Verification |
|---|---|---|---|---|
| UPDATE | `package.json`, `package-lock.json` | Add `prettier` (types formatting), `@playwright/test`, Base UI deps from shadcn; scripts `db:types`, `test:e2e` | D-021, D-023 | ✅ `npm ci`-compatible lockfile |
| UPDATE | `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts` | Typed with generated `Database` | | ✅ typecheck |
| UPDATE | `src/lib/supabase/proxy.ts` | Optimistic redirects that carry refreshed cookies | ARCHITECTURE §6 | ✅ E2E |
| CREATE | `src/lib/auth/session.ts` | `getSessionState()` (React.cache, `connection()`, `getClaims()`) / `requireUser()` | D-019 | ✅ E2E |
| CREATE | `src/lib/auth/roles.ts`, `src/lib/auth/roles.test.ts` | Role labels + UI capability map mirroring SECURITY matrix | | ✅ unit 5/5 |
| CREATE | `src/lib/safe-redirect.ts`, `src/lib/safe-redirect.test.ts` | Open-redirect-safe `next` handling | SECURITY §1 | ✅ unit 10/10, E2E |
| CREATE | `src/features/auth/schemas.ts`, `src/features/auth/actions.ts` | Sign-in validation; sign-in/out Server Actions (local sign-out) | D-020 | ✅ E2E |
| CREATE | `src/features/auth/components/login-form.tsx` | Accessible login form (`Field`, `aria-invalid`, pending state) | | ✅ E2E |
| CREATE | `src/app/(auth)/layout.tsx`, `src/app/(auth)/login/page.tsx`, `src/app/(auth)/no-access/page.tsx` | Auth route group pages | | ✅ build, E2E |
| CREATE | `src/app/(app)/layout.tsx`, `src/app/(app)/dashboard/page.tsx` | Authenticated shell + dashboard | D-007 | ✅ build (partial prerender), E2E |
| CREATE | `src/features/dashboard/components/welcome-card.tsx` | Signed-in identity, organization, role | | ✅ E2E |
| CREATE | `src/components/layout/app-sidebar.tsx`, `src/components/layout/user-menu.tsx` | Sidebar navigation and user menu with sign-out | | ✅ E2E (desktop + mobile) |
| CREATE | `src/components/ui/{alert,avatar,badge,button,card,dropdown-menu,field,input,label,separator,sheet,sidebar,skeleton,spinner,tooltip}.tsx` | shadcn components via `shadcn@4.21.4 add` | D-012 | ✅ lint, typecheck |
| CREATE | `src/hooks/use-mobile.ts` | Added by shadcn; rewritten to `useSyncExternalStore` (lint: setState in effect) | | ✅ lint |
| UPDATE | `src/app/layout.tsx` | Wrap app in `TooltipProvider` | | ✅ build |
| UPDATE | `src/app/page.tsx` | Landing gets a real "Sign in" link (`nativeButton={false}`) | | ✅ build |
| CREATE | `playwright.config.ts`, `e2e/auth.spec.ts` | E2E config (desktop + mobile, serial locally) and auth flow tests | D-021 | ✅ 10/10 twice |

## 2026-10-12 · M2: Documentation

| Action | Path | Purpose | Verification |
|---|---|---|---|
| UPDATE | `docs/DATA_MODEL.md` | Design → implemented; migrations table; column-grant matrix | ✅ matches migrations |
| UPDATE | `docs/SECURITY.md` | Implemented controls, helper functions, test evidence | ✅ |
| UPDATE | `docs/DECISIONS.md` | D-011 accepted; D-015 correction; D-016 – D-023 | ✅ |
| UPDATE | `docs/CONVENTIONS.md` | RLS helper pattern, column grants, proxy cookies, `connection()`, local sign-out, `nativeButton` | ✅ |
| UPDATE | `docs/ARCHITECTURE.md`, `docs/TESTING.md`, `docs/ROADMAP.md`, `docs/DEPLOYMENT.md` | Status, commands, results, hosted-auth notes | ✅ |
| UPDATE | `README.md`, `AGENTS.md` | Status, local demo accounts, test commands | ✅ |
| UPDATE | `docs/CHANGELOG.md`, `docs/FILE-CHANGE-LOG.md` | M2 entries | ✅ reconciled with `git status` |

## 2026-10-12 · Impeccable UI/UX skill

| Action | Path | Purpose | Related | Verification |
|---|---|---|---|---|
| CREATE | `.claude/skills/impeccable/**` (SKILL.md, reference/ (42), scripts/, agents/; 62 files) | Project-local UI/UX design skill | D-024 | ✅ copies, discovered, audited |
| UPDATE | `skills-lock.json` | Add `impeccable` source + content hash | AGENT-SKILLS | ✅ inspected diff |
| UPDATE | `eslint.config.mjs` | Ignore `.claude/**` (vendored skills; Impeccable's bundled JS produced 94 lint warnings) | | ✅ `npm run lint` clean |
| UPDATE | `docs/AGENT-SKILLS.md` | Source, commit, verification, audit notes, conflicts | | ✅ |
| UPDATE | `docs/DECISIONS.md` | D-024 (Operate mode, precedence, opt-in engine/hooks), D-025 (PRODUCT/DESIGN authority, proposed) | | ✅ |
| UPDATE | `docs/CONVENTIONS.md` | §6 UX review workflow with Impeccable | | ✅ |
| UPDATE | `AGENTS.md` | Skill list + Impeccable guardrails | | ✅ |
| UPDATE | `docs/ROADMAP.md` | Impeccable pass in each M3 slice; DESIGN.md task | | ✅ |
| UPDATE | `docs/CHANGELOG.md`, `docs/FILE-CHANGE-LOG.md` | This entry | | ✅ reconciled with `git status` |

## 2026-10-12 · M3 step 0: Design system

| Action | Path | Purpose | Related | Verification |
|---|---|---|---|---|
| CREATE | `DESIGN.md` | Design system "The Bridge Console" (tokens + rules) | D-026 | ✅ matches `globals.css` |
| CREATE | `.impeccable/design.json` | Impeccable sidecar: ramps, components, narrative | D-026 | ✅ valid JSON |
| CREATE | `.impeccable/config.json` | Shared Impeccable config, design hook enabled (written by `impeccable hooks on`) | D-024 | ✅ hook fires on Edit/Write |
| UPDATE | `.gitignore` | Ignore `.claude/settings.local.json`, `.impeccable/config.local.json`, hook caches, review/build artefacts | D-024 | ✅ `git status` shows only shared files |
| UPDATE | `src/app/globals.css` | Navy primary, status tokens, cool sidebar, ring/chart ramp, destructive AA fix, selection/caret | D-026 | ✅ contrast script, build, screenshots |
| UPDATE | `src/components/ui/badge.tsx` | `success` / `warning` / `info` variants | D-026 | ✅ hook scan clean, typecheck |
| UPDATE | `src/app/(app)/layout.tsx` | Separator uses Base UI `data-vertical:` selectors | CONVENTIONS §6 | ✅ screenshots |
| UPDATE | `docs/DECISIONS.md` | D-024 approval, D-025 accepted, D-026 | | ✅ |
| UPDATE | `docs/CONVENTIONS.md`, `docs/AGENT-SKILLS.md`, `docs/ARCHITECTURE.md`, `docs/TESTING.md`, `docs/ROADMAP.md`, `README.md` | Design system references, Base UI selector rule, results | | ✅ |
| UPDATE | `docs/CHANGELOG.md`, `docs/FILE-CHANGE-LOG.md` | This entry | | ✅ reconciled with `git status` |

Not tracked (machine-local, outside the repo or git-ignored): `~/.impeccable/bin/0.1.14/impeccable`, `.claude/settings.local.json`, `.impeccable/config.local.json`.

## 2026-10-12 · M3 slice 1: Vessels

| Action | Path | Purpose | Related | Verification |
|---|---|---|---|---|
| RENAME | `vitest.config.ts` → `vitest.config.mts` | Explicit ESM config (Vite CJS-loader deprecation warning) | | ✅ `npm test` |
| CREATE | `src/components/ui/{table,select,empty,input-group,breadcrumb,textarea}.tsx` | shadcn components via `shadcn@4.21.4 add` | D-012 | ✅ lint, typecheck |
| UPDATE | `src/components/ui/{button,input,select,input-group,sidebar}.tsx` | 44px coarse-pointer targets | D-029 | ✅ measured |
| CREATE | `src/features/vessels/domain.ts`, `schemas.ts`, `vessels.test.ts` | Labels, badge mapping, IMO check, attention ordering; Zod form + URL params | D-028 | ✅ unit |
| CREATE | `src/features/vessels/server/queries.ts`, `server/mutations.ts`, `actions.ts` | Server-only DAL (attention counts, detail, edit values), writes with role checks, thin Server Actions | D-028 | ✅ E2E |
| CREATE | `src/features/vessels/components/{vessels-list,vessel-filters,vessel-detail,vessel-form,vessel-status-badge,attention-signals}.tsx` | Vessels UI | D-028 | ✅ E2E, detector |
| CREATE | `src/app/(app)/vessels/page.tsx`, `new/page.tsx`, `[vesselId]/page.tsx`, `[vesselId]/edit/page.tsx`, `[vesselId]/not-found.tsx` | Vessel routes | | ✅ build (partial prerender) |
| CREATE | `src/app/(app)/error.tsx` | App-shell error boundary | | ✅ build |
| CREATE | `src/components/layout/page-header.tsx` | Title, badge outside h1, breadcrumbs, actions | | ✅ |
| CREATE | `src/components/shared/{button-link,forbidden-state,saved-notice}.tsx`, `src/components/shared/panel.ts` | Shared UI primitives | D-027 | ✅ |
| CREATE | `src/lib/format.ts` | Date/number formatting, today's ISO date | | ✅ |
| UPDATE | `src/components/layout/app-sidebar.tsx` | Vessels nav item; active-state lookup behind Suspense | | ✅ build |
| UPDATE | `src/components/layout/user-menu.tsx` | Avatar initials contrast | | ✅ detector |
| UPDATE | `src/app/page.tsx` | Landing sign-in uses `ButtonLink` | D-027 | ✅ |
| CREATE | `e2e/helpers.ts`, `e2e/vessels.spec.ts` | Shared sign-in/IMO helpers; vessel flows | D-030 | ✅ 20/20 |
| UPDATE | `e2e/auth.spec.ts` | Use shared helpers | | ✅ |
| CREATE | `.impeccable/critique/2026-10-12T09-13-47Z__src-app-app-vessels.md` | Critique snapshot (read by `impeccable polish`) | D-024 | ✅ |
| UPDATE | `DESIGN.md` | Vessel status mapping, attention signals, wayfinding, Deck Hand Rule | | ✅ |
| UPDATE | `docs/{DECISIONS,CONVENTIONS,SECURITY,TESTING,ARCHITECTURE,ROADMAP,CHANGELOG,FILE-CHANGE-LOG}.md`, `README.md` | D-027 – D-030, conventions, evidence | | ✅ reconciled with `git status` |

## 2026-10-15 · M3 slice 2: Inspections

| Action | Path | Purpose | Related | Verification |
|---|---|---|---|---|
| CREATE | `supabase/migrations/20261014174645_require_inspector_role_for_item_updates.sql` | Fix forward: role re-check in the `inspection_items` update policy (`npx supabase migration new`) | D-031 | ✅ `db reset`, pgTAP |
| CREATE | `supabase/tests/07_inspection_results.test.sql` | Who may record results; demoted inspector blocked | D-031 | ✅ red on old policy, green on new |
| CREATE | `src/components/ui/{alert-dialog,toggle,toggle-group}.tsx` | shadcn components (`shadcn add`; `button.tsx` overwrite declined) | | ✅ typecheck |
| UPDATE | `src/components/ui/toggle.tsx` | 44px coarse-pointer target | D-029 | ✅ screenshots |
| CREATE | `src/components/shared/url-filters.tsx` | Shared URL-synced filters | D-033 | ✅ vessels + inspections E2E |
| UPDATE | `src/features/vessels/components/vessel-filters.tsx` | Use shared filters | D-033 | ✅ |
| UPDATE | `src/features/vessels/components/vessel-detail.tsx` | Schedule inspection action, inspection links, shared status badge | | ✅ |
| UPDATE | `src/components/layout/page-header.tsx` | Actions wrap on narrow screens | | ✅ screenshots |
| UPDATE | `src/components/layout/app-sidebar.tsx` | Inspections nav item | | ✅ |
| CREATE | `src/features/inspections/{domain,schemas}.ts`, `inspections.test.ts` | Rules (conduct rights, overdue, checklist summary, templates), Zod schemas | D-032 | ✅ unit 16 |
| CREATE | `src/features/inspections/server/{queries,mutations}.ts`, `actions.ts` | DAL, RPC + status/result writes, Server Actions | D-032, D-033 | ✅ E2E |
| CREATE | `src/features/inspections/components/{inspection-badges,inspection-filters,inspections-list,inspection-detail,inspection-actions,checklist-item,schedule-inspection-form}.tsx` | Inspections UI | D-032 | ✅ detector hook clean, screenshots |
| CREATE | `src/app/(app)/inspections/page.tsx`, `new/page.tsx`, `[inspectionId]/page.tsx`, `[inspectionId]/not-found.tsx` | Inspection routes | | ✅ build |
| UPDATE | `e2e/helpers.ts` | Inspector user | | ✅ |
| CREATE | `e2e/inspections.spec.ts` | Inspection flows (lifecycle, validation, viewer, cross-org) | D-030 | ✅ 28/28 suite |
| UPDATE | `DESIGN.md` | Inspection badge mapping, checklist recording pattern | | ✅ |
| UPDATE | `docs/{DECISIONS,CONVENTIONS,SECURITY,DATA_MODEL,TESTING,ARCHITECTURE,ROADMAP,CHANGELOG,FILE-CHANGE-LOG}.md`, `README.md` | D-031 – D-033, evidence | | ✅ reconciled with `git status` |

## 2026-10-15 · M3 slice 3: Work orders

| Action | Path | Purpose | Related | Verification |
|---|---|---|---|---|
| CREATE | `src/features/work-orders/{domain,schemas}.ts`, `work-orders.test.ts` | Transitions, status rights, urgency order, audit-event descriptions; Zod schemas | D-034 | ✅ unit 10 |
| CREATE | `src/features/work-orders/server/{queries,mutations}.ts`, `actions.ts` | Queue, detail + history, form options, failed-check lookup; create / edit / status writes | D-034 | ✅ E2E |
| CREATE | `src/features/work-orders/components/{work-order-badges,work-order-filters,work-orders-list,work-order-detail,work-order-status-actions,work-order-form}.tsx` | Work-order UI | D-034 | ✅ detector, screenshots |
| CREATE | `src/app/(app)/work-orders/page.tsx`, `new/page.tsx`, `[workOrderId]/page.tsx`, `[workOrderId]/edit/page.tsx`, `[workOrderId]/not-found.tsx` | Work-order routes | | ✅ build |
| UPDATE | `src/features/vessels/server/queries.ts`, `src/features/inspections/server/queries.ts`, `src/app/(app)/inspections/page.tsx` | `listVesselNames` moved to vessels | D-034 | ✅ typecheck |
| UPDATE | `src/features/vessels/components/vessel-detail.tsx` | Shared work-order badges, linked titles, "View all" | | ✅ |
| UPDATE | `src/features/inspections/components/{checklist-item,inspection-detail}.tsx` | "Raise work order" on failed checks; work-order links | D-034 | ✅ E2E |
| UPDATE | `src/components/layout/app-sidebar.tsx` | Work orders nav item | | ✅ |
| CREATE | `e2e/work-orders.spec.ts` | Raise → start → block → resume → complete across two roles; validation; viewer; cross-org | D-030 | ✅ 36/36 suite |
| UPDATE | `e2e/inspections.spec.ts` | Raise the follow-up from the failed check | | ✅ |
| UPDATE | `DESIGN.md` | Work-order badges and status-action pattern | | ✅ |
| UPDATE | `docs/{DECISIONS,TESTING,ARCHITECTURE,ROADMAP,CHANGELOG,FILE-CHANGE-LOG}.md`, `README.md` | D-034, evidence | | ✅ reconciled with `git status` |


## 2026-10-15 · M3 slice 4: Live dashboard

| Action | Path | Purpose | Related | Verification |
|---|---|---|---|---|
| CREATE | `src/features/dashboard/domain.ts`, `dashboard.test.ts` | `buildDashboard()`: figures and queues from plain rows (due-soon window, failed-check retention, ordering, limits) | D-035 | ✅ unit 16 |
| CREATE | `src/features/dashboard/server/queries.ts` | `getDashboard()`: five parallel RLS-scoped reads → `buildDashboard()` | D-035 | ✅ E2E 42/42 ×2 |
| CREATE | `src/features/dashboard/components/{dashboard-summary,dashboard-panels,dashboard-view}.tsx` | Figures row, queue panels, skeleton | D-035 | ✅ `impeccable detect` `[]`, screenshots desktop + Pixel 7 |
| DELETE | `src/features/dashboard/components/welcome-card.tsx` | Replaced by the live dashboard | | ✅ no references left |
| UPDATE | `src/app/(app)/dashboard/page.tsx` | `PageHeader` + streamed dashboard behind a shaped skeleton | | ✅ build (partial prerender) |
| UPDATE | `src/features/vessels/domain.ts`, `src/features/vessels/server/queries.ts` | `tallyAttention()` / `emptyAttention()` shared by the watch list and the dashboard | D-035 | ✅ unit, typecheck |
| UPDATE | `src/features/vessels/actions.ts` | Vessel saves revalidate the app-shell layout (status feeds the dashboard) | D-033, D-035 | ✅ typecheck |
| CREATE | `e2e/dashboard.spec.ts` | Org queues + isolation; failed check → follow-up → work raised, with figures and a viewer; per-user callouts | D-030 | ✅ 42/42 suite, two consecutive runs |
| UPDATE | `e2e/auth.spec.ts` | Dashboard assertions follow the welcome card's removal | | ✅ |
| UPDATE | `DESIGN.md` | Dashboard pattern (figures row, queue panels) | D-035 | ✅ |
| UPDATE | `docs/{DECISIONS,ARCHITECTURE,ROADMAP,TESTING,CHANGELOG,FILE-CHANGE-LOG}.md`, `README.md` | D-035, evidence, critique result | | ✅ reconciled with `git status` |
| CREATE | `.impeccable/critique/2026-10-15T04-09-20Z__src-app-app-{inspections,work-orders}.md` | Impeccable critique snapshot (one combined run, stored per route) for a later `polish` | D-024 | ✅ written by `critique-storage` |

## 2026-10-15 · Critique fixes: inspections and work orders (P1 + P2)

| Action | Path | Purpose | Related | Verification |
|---|---|---|---|---|
| CREATE | `src/features/inspections/components/complete-inspection.tsx` | Confirmed completion: result summary, freeze warning, unaddressed failures with "Raise work order" | D-036 | ✅ E2E (dialog, notice) |
| UPDATE | `src/features/inspections/components/{inspection-actions,inspection-detail}.tsx` | Use the confirmed completion; repeat it at the end of the checklist; completion notice with follow-up count; `h2` checklist title; drop "Completed: Not yet" | D-036 | ✅ E2E, screenshots |
| UPDATE | `src/features/inspections/actions.ts` | Completion redirects to `?saved=completed` | D-036 | ✅ E2E |
| UPDATE | `src/features/inspections/components/checklist-item.tsx` | Recorded failures collapse to a read-only finding + "Edit finding"; severity as radio choice cards with full guidance | D-036 | ✅ E2E, screenshots (86px cards) |
| UPDATE | `src/features/inspections/components/inspection-badges.tsx` | Overdue beside the lifecycle badge, not instead of it | D-036 | ✅ screenshots |
| CREATE | `src/components/ui/radio-group.tsx` | shadcn `radio-group` (`npx shadcn@4.21.4 add radio-group`, reviewed; no new dependency) | D-014 | ✅ typecheck |
| UPDATE | `src/components/ui/{select,dropdown-menu}.tsx` | `pointer-coarse:min-h-11` on SelectItem and DropdownMenuItem (Deck Hand Rule) | D-029 | ✅ measured 44px on Pixel 7, 28px desktop |
| UPDATE | `src/features/work-orders/components/work-order-detail.tsx`, `src/components/shared/saved-notice.tsx` | Alert icon tints set on the Alert (they were overridden to ink); `h2` card titles | D-036 | ✅ computed colour checked |
| UPDATE | `src/features/vessels/components/vessel-detail.tsx` | `h2` card titles (same convention) | | ✅ typecheck |
| UPDATE | `e2e/{inspections,dashboard}.spec.ts` | Severity radios; confirmed completion, collapsed finding, completion notice; both Complete buttons and hints | | ✅ 42/42 ×2 |
| UPDATE | `DESIGN.md`, `docs/{CONVENTIONS,DECISIONS,TESTING,CHANGELOG,ROADMAP,FILE-CHANGE-LOG}.md` | Patterns, Alert icon and card-title conventions, D-036, evidence, re-critique result | D-036 | ✅ reconciled with `git status` |
| CREATE | `.impeccable/critique/2026-10-15T04-55-22Z__src-app-app-{inspections,work-orders}.md` | Re-critique snapshot (27/40) | D-024 | ✅ written by `critique-storage` |

## 2026-10-15 · Re-critique fixes: protect recorded failures, follow-up flow, urgency (D-037)

| Action | Path | Purpose | Related | Verification |
|---|---|---|---|---|
| CREATE | `supabase/migrations/20261015051635_protect_linked_failed_checks.sql` | Trigger: a failed check with a work order keeps `result = 'fail'` | D-037 | ✅ `db:reset`, `db:lint`, advisors |
| CREATE | `supabase/tests/08_linked_failed_checks.test.sql` | 7 pgTAP tests (inspector, manager, refine finding, unlinked correction) | D-037 | ✅ red first, then 85/85 |
| UPDATE | `src/features/inspections/server/mutations.ts` | Plain-language message for the new trigger error | D-037 | ✅ typecheck |
| UPDATE | `src/features/inspections/components/checklist-item.tsx` | Confirm before replacing a failure; lock Pass/N/A on linked failures; report open edits | D-037 | ✅ E2E, screenshots |
| CREATE | `src/features/inspections/components/checklist-editing.tsx` | Context: Complete waits for open edits; shared Complete hint | D-037 | ✅ E2E |
| UPDATE | `src/features/inspections/components/{complete-inspection,inspection-actions,inspection-detail}.tsx`, `src/app/(app)/inspections/[inspectionId]/page.tsx` | Editing provider and hints; "Work order raised" notice with link (validated `workOrder` param) | D-037 | ✅ E2E |
| UPDATE | `src/features/work-orders/{actions.ts,server/mutations.ts}` | Follow-ups redirect back to their inspection | D-037 | ✅ E2E |
| UPDATE | `src/features/work-orders/components/work-order-form.tsx`, `src/app/(app)/work-orders/new/page.tsx` | Severity badge in the follow-up context | D-037 | ✅ screenshot |
| UPDATE | `src/features/work-orders/components/work-order-status-actions.tsx` | Other moves step aside while the block form is open | D-037 | ✅ measured |
| UPDATE | `src/features/work-orders/{domain.ts,work-orders.test.ts}`, `src/features/dashboard/dashboard.test.ts` | Tiered urgency (`urgencyTier`, `compareByUrgency`) | D-037 | ✅ unit 76/76 (red first) |
| UPDATE | `src/app/(app)/work-orders/page.tsx`, `src/features/dashboard/components/dashboard-panels.tsx` | Queue description follows the new order | D-037 | ✅ |
| UPDATE | `src/components/shared/saved-notice.tsx` | Optional link + description; resets when its message changes (reused pages) | D-037 | ✅ E2E red → green |
| UPDATE | `e2e/{inspections,dashboard}.spec.ts` | Replace confirm, Complete waits, return to inspection + link, linked lock, dismissed-notice repro | D-037 | ✅ 42/42 ×4 |
| UPDATE | `DESIGN.md`, `docs/{DATA_MODEL,SECURITY,DECISIONS,TESTING,CHANGELOG,ROADMAP,FILE-CHANGE-LOG}.md` | D-037, rules, evidence | D-037 | ✅ reconciled with `git status` |

## 2026-10-15 · Close out the dashboard slice (Impeccable doctor, critique, audit)

| Action | Path | Purpose | Related | Verification |
|---|---|---|---|---|
| CREATE | `PRODUCT.md` | Pointer to `docs/PRODUCT.md` so Impeccable resolves product context (never a copy) | D-025 | ✅ `impeccable context` → `productPath: PRODUCT.md`, `platform: web` |
| UPDATE | `docs/DECISIONS.md` | D-025: fallback applied | D-025 | ✅ |
| CREATE | `.impeccable/critique/*__src-app-app-dashboard.md` | Dashboard critique snapshot (28/40) | D-024 | ✅ written by `critique-storage` |
| UPDATE | `docs/TESTING.md` | Doctor, critique and audit results | | ✅ |
| UPDATE | `src/features/dashboard/{domain.ts,dashboard.test.ts}` | `failedChecksTotal` (test first) | D-038 | ✅ unit 77/77 |
| UPDATE | `src/features/dashboard/components/{dashboard-summary,dashboard-panels,dashboard-view}.tsx` | Figures jump to panels with sentence names; container-query grid; wrapping rows; 44px work-order and "assigned to you" links; truncation note; "Fleet summary" region; announced, matching skeleton | D-038 | ✅ measured at normal and 200% text |
| UPDATE | `src/app/(app)/layout.tsx`, `src/components/layout/app-sidebar.tsx` | Skip link to `#content`; `nav` landmark with `aria-current` | D-038 | ✅ E2E |
| UPDATE | `src/components/ui/skeleton.tsx` | No pulse under reduced motion | D-038 | ✅ |
| UPDATE | `e2e/{dashboard,auth}.spec.ts` | Figure jump + focus, skip link, nav landmark; organisation name no longer a heading | D-038 | ✅ 18/18, suite 44/44 |
| UPDATE | `DESIGN.md`, `docs/{DECISIONS,TESTING,CHANGELOG,ROADMAP,FILE-CHANGE-LOG}.md` | D-038, light-only note, evidence | D-038 | ✅ reconciled with `git status` |

## 2026-10-15 · M5 preparation: demo seed and token scope

| Action | Path | Purpose | Related | Verification |
|---|---|---|---|---|
| CREATE | `scripts/demo-seed.mjs` | Hosted demo seed generated from `supabase/seed.sql`; run-time passwords; guards | D-011 | ✅ local end-to-end, pgTAP 85/85 on its data |
| CREATE | `scripts/demo-seed.test.mjs` | Admin never published; single replacement; refuses unknown seed | D-011 | ✅ 3/3 |
| UPDATE | `vitest.config.mts` | Also run `scripts/**/*.test.mjs` | | ✅ 80/80 |
| UPDATE | `docs/{DEPLOYMENT,DECISIONS,ARCHITECTURE,TESTING,CHANGELOG,FILE-CHANGE-LOG}.md` | Token scope, demo-seed procedure, evidence | D-011 | ✅ reconciled with `git status` |
