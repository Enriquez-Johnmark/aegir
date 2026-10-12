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

## M3: Vertical slices (P0 → P1) ⬜ ← next
Each slice: schema already in place → DAL → actions → UI (loading, empty, error, unauthorized states) → tests → docs and ledger.
1. [ ] Vessels: list (search, filter, sort), detail, create, edit
2. [ ] Inspections: schedule with checklist (RPC), record results, complete, follow-up flag
3. [ ] Work orders: create (incl. from a failed item), transitions, overdue, history
4. [ ] Dashboard: live metrics
5. [ ] Handovers UI ✂️ (P1; schema, rules and tests already done in M2)
6. [ ] Audit history UI ✂️ (P1; audit triggers already live since M2)

## M4: Verification ⬜
- [ ] Playwright feature flows (auth already covered) + axe accessibility smoke
- [ ] Responsive check (mobile/desktop)
- [ ] `db advisors` clean; migration history reconciled

## M5: Deployment ⬜
- [ ] Supabase Cloud + Vercel per [DEPLOYMENT.md](DEPLOYMENT.md); smoke tests on the live URL

## M6: Portfolio polish and independent review ⬜
- [ ] Real screenshots, README live URL, limitations
- [ ] Independent review (security, migrations, tests, docs); fix high-impact findings

## Blockers / prerequisites
- Supabase Cloud project + scoped access token (owner), needed only at M5.
- Vercel account linked to GitHub (owner), needed only at M5.
