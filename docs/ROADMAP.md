# Roadmap

**Target:** presentable MVP around **2026-10-15**. As of **2026-10-12** that leaves about three working days. That is very tight for the full brief, so the plan protects **P0 vertical slices first** and cuts P1/P2 before quality, security or honesty. A later, honest date beats a rushed one.

Legend: ✅ done · 🟡 in progress · ⬜ not started · ✂️ cut candidate if time runs out

## M0: Reconnaissance and skills ✅ (2026-10-12)
- [x] Inspect repo (empty, `main`, remote `origin` configured, no commits)
- [x] Install 4 project-local skills (copies, not symlinks); verify discovery; no global changes
- [x] Read every SKILL.md, record conflicts (D-004, D-008, D-010, D-014)

## M1: Foundation 🟡
Acceptance: lint, typecheck, unit tests and build pass; local Supabase starts; docs describe the architecture, conventions, data model and security model.
- [x] Next.js 16.4 + TS strict + Tailwind v4 + ESLint scaffold (`src/`)
- [x] shadcn/ui init (base-nova); Supabase CLI pinned; `supabase init` with hardened auth config
- [x] Supabase SSR clients (browser/server/proxy) + Zod env validation + unit tests
- [x] Documentation set
- [ ] Vitest + Playwright config for E2E (Playwright deferred to M4)

## M2: Schema, auth and RLS (P0) ⬜
Acceptance: `db reset` builds the schema from migrations alone; pgTAP proves cross-organization isolation and role limits for every table; types generated; login and logout work; the authenticated shell renders the user's organization.
- [ ] Migration: enums, organizations, profiles (+ new-user trigger), memberships, `private` helper functions, RLS
- [ ] Migration: vessels, inspections, inspection_items, work_orders (+ composite FKs, indexes, transition triggers, RLS, grants)
- [ ] Migration: audit_events + audit triggers; handovers (P1, may slip)
- [ ] Seed: 2 organizations (to prove isolation), users per role, realistic synthetic fleet data
- [ ] pgTAP RLS and constraint suites
- [ ] `src/lib/auth` (getCurrentUser / requireRole), `(auth)/login`, `(app)` shell with sidebar
- [ ] Decide D-011 demo access

## M3: Vertical slices (P0 → P1) ⬜
Each slice: schema already in place → DAL → actions → UI (loading, empty, error, unauthorized states) → tests → docs and ledger.
1. [ ] Vessels: list (search, filter, sort), detail, create, edit
2. [ ] Inspections: schedule with checklist (RPC), record results, complete, follow-up flag
3. [ ] Work orders: create (incl. from a failed item), transitions, overdue, history
4. [ ] Dashboard: live metrics
5. [ ] Handovers ✂️ (P1)
6. [ ] Audit history UI ✂️ (P1; triggers still ship in M2)

## M4: Verification ⬜
- [ ] Playwright critical flows + axe accessibility smoke
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
