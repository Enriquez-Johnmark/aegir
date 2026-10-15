# Roadmap

**Target:** presentable MVP around **2026-10-15**. As of **2026-10-12** that leaves about three working days. That is very tight for the full brief, so the plan protects **P0 vertical slices first** and cuts P1/P2 before quality, security or honesty. A later, honest date beats a rushed one.

Legend: ✅ done · 🟡 in progress · ⬜ not started · ✂️ cut candidate if time runs out

## M0: Reconnaissance and skills ✅ (2026-10-12)
- [x] Inspect repo (empty, `main`, remote `origin` configured, no commits)
- [x] Install 4 project-local skills (copies, not symlinks); verify discovery; no global changes
- [x] Read every SKILL.md, record conflicts (D-004, D-008, D-010, D-014)

## M1: Foundation ✅ (2026-10-12)
Acceptance: lint, typecheck, unit tests and build pass; local Supabase starts; docs describe the architecture, conventions, data model and security model.
- [x] Next.js 16.4 + TS strict + Tailwind v4 + ESLint scaffold (`src/`)
- [x] shadcn/ui init (base-nova); Supabase CLI pinned; `supabase init` with hardened auth config
- [x] Supabase SSR clients (browser/server/proxy) + Zod env validation + unit tests
- [x] Documentation set
- [x] Vitest config; Playwright added in M2 (D-021)

## M2: Schema, auth and RLS (P0) ✅ (2026-10-12)
Acceptance: `db reset` builds the schema from migrations alone; pgTAP proves cross-organization isolation and role limits for every table; types generated; login and logout work; the authenticated shell renders the user's organization.
- [x] Migration: default-privilege hardening, enums, organizations, profiles (+ new-user trigger), memberships, `private` helper functions, RLS
- [x] Migrations: vessels, inspections (+ `create_inspection` RPC), work_orders (composite FKs, indexes, transition triggers, column grants)
- [x] Migrations: handovers and audit_events + audit triggers (pulled forward from P1; cheap at the schema level)
- [x] Seed: 2 organizations, 8 users across all roles, realistic synthetic fleet data driven through the real triggers
- [x] pgTAP: 73 tests across 6 files (RLS isolation, role limits, transitions, immutability, audit)
- [x] Generated types; `src/lib/auth` (getSessionState / requireUser, roles), `(auth)/login`, `/no-access`, `(app)` shell with sidebar and user menu
- [x] Playwright auth E2E (10 tests, desktop + mobile)
- [x] D-011 demo access decided (option a)
- Found and fixed along the way: email provider accidentally disabled (D-015 correction), global sign-out (D-020), legacy default privileges (D-022)

## M3: Vertical slices (P0 → P1) 🟡 ← in progress
Each slice: schema already in place → DAL → actions → UI (loading, empty, error, unauthorized states) → Impeccable `critique` + `audit`, fixes, `polish` (D-024) → tests → docs and ledger.
0. [x] D-025 accepted; design system captured with `impeccable document` → `DESIGN.md` "The Bridge Console" (D-026); engine + hooks enabled (D-024)
1. [x] Vessels: watch-list (attention first), search, filters, detail, create, edit; Impeccable critique 25/40 → all P1/P2 fixed (D-027 – D-030)
2. [x] Inspections: schedule with checklist (RPC + templates), start, record results (pass/N/A one tap, fail with finding + severity), complete/cancel, derived follow-up flag; RLS role re-check fixed forward (D-031 – D-033)
3. [x] Work orders: urgency queue (overdue → priority → due), create (incl. from a failed check, prefilled), transitions with blocked reason and confirmed completion, manager edit, history from the audit log (D-034)
4. [x] Dashboard: live figures (fleet, inspections due/overdue, open/overdue/blocked work, failed checks needing follow-up, pending handovers) and queues; a failed check without work is never truncated (D-035)
4a. [x] Impeccable critique of inspections + work orders (29/40) → P1/P2 fixes (D-036) → re-critique 27/40 with one new, pre-existing P1 (a recorded failure can be erased by one tap) → P1 + P2 fixed (D-037: DB lock + inline confirm, follow-ups return to the inspection, one primary per sub-task, tiered urgency). Open from the re-critique: P3 tall Fail panel on phones, "Pass remaining", inspections "Assigned to me", blocked-for-N-days, closing note on completion
5. [x] Handovers: inbox list (yours first), detail with recipient-only acknowledgement, send from a work order or vessel, dashboard rows link through (D-041)
6. [x] Audit history: organization-wide Audit log (`/audit`, by record type and person, keyset paging) and a History card on every record; critique 28/40, audit 16/20 → P1/P2/quick P3 fixes (D-042). Deferred: date and vessel filters, sticky day headings, collapsed runs

## M4: Verification 🟡
- [x] Dashboard slice closed out: Impeccable doctor (product pointer, D-025), critique 28/40 and audit 15/20 → accessibility and touch fixes (D-038); "For you" band and quieter signals deferred
- [ ] Dark theme (light-only MVP, D-038)
- [x] Playwright feature flows (auth, dashboard, vessels, inspections, work orders, security headers) + axe WCAG 2.2 AA on every route, desktop and Pixel 7 (D-040)
- [x] Responsive check: lists, filters and dashboard at 320px–1360px and 200% text (D-038, D-040)
- [x] `db advisors` clean locally and on the hosted project; migration history local = remote (8/8)
- [x] E2E isolation: every run starts from the seed (`globalSetup`, `db reset --local`)

## M5: Deployment ✅ (2026-10-15)
- [x] Supabase Cloud + Vercel per [DEPLOYMENT.md](DEPLOYMENT.md): https://aegir-eight.vercel.app; schema 8/8, advisors clean, demo seed; smoke test 31/31 on the live URL

## M6: Portfolio polish and independent review 🟡
- [x] Security headers and CSP (D-039)
- [ ] Real screenshots, README live URL, limitations
- [ ] Independent review (security, migrations, tests, docs); fix high-impact findings

## Blockers / prerequisites
- Supabase Cloud project + scoped access token (owner), needed only at M5.
- Vercel account linked to GitHub (owner), needed only at M5.
