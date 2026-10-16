# Deployment

> **Status: deployed (2026-10-15).** https://aegir-eight.vercel.app (Vercel production domain, region `sin1`) on Supabase project "Aegir" (ref `lerdmictefgrcmbovlft`, `ap-southeast-1`, Postgres 17.11) with all 9 migrations (the ninth, `20261016000517_harden_after_independent_review` (D-043), pushed 2026-10-16) and the demo seed. Per-deployment and team URLs stay behind Vercel Authentication (Standard Protection); the production domain is public.

### Deployment log

| Date | Step | Result |
|---|---|---|
| 2026-10-15 | Link (scoped read-only token; `projects list` shows only this project) | ✅ `ACTIVE_HEALTHY`, Postgres 17.11 (same as local). Changelog "Postgres 15.19 / 17.11 breaking changes" checked: we use no `ltree`, `btree_gist`, PGP functions or custom operators, so no action |
| 2026-10-15 | `migration list` / `db push --dry-run` (owner's terminal, password in session env) | ✅ remote empty; exactly the 8 committed migrations pending |
| 2026-10-15 | `db push` (owner's explicit go-ahead) | ✅ 8/8 applied in order; no seed |
| 2026-10-15 | `migration list` / `db advisors --linked` | ✅ local = remote for all 8; advisors "No issues found". (`db advisors --linked` needs `database_write` through the read-only token, so the owner ran it with the password; the token was not widened) |
| 2026-10-15 | Demo seed (`scripts/demo-seed.mjs` → session pooler, single transaction) | ✅ 2 organizations, 8 users and memberships, 8 vessels, 7 inspections, 22 checklist items, 7 work orders, 4 handovers; no password echoed. Demo password chosen by the owner; admin password random and unrecorded |
| 2026-10-15 | Vercel import (root `./`, Next.js preset, `NEXT_PUBLIC_SUPABASE_URL` + publishable key only) | ✅ production deployment of `437dd75` succeeded |
| 2026-10-15 | Supabase Auth URL configuration (Site URL + redirect `https://aegir-eight.vercel.app/**`) | ✅ set by the owner on 2026-10-16 (password sign-in worked without it; needed for any email links) |
| 2026-10-15 | Smoke test (Playwright against production; read-only and permission checks, no data created) | ✅ 31/31: `/` and `/login` 200; `/dashboard` signed out → 307 to `/login`; all four demo roles sign in (2.2–3.1 s to dashboard content); figures match the seed (4 of 6 vessels active, 3 inspections due / 2 overdue, 5 open work orders / 2 overdue / 1 blocked, 0 follow-ups, 2 pending handovers); no Meridian data; another organization's inspection, vessel and work order are not found; viewer sees no write controls and `/vessels/new`, `/inspections/new` refuse; admin and Meridian logins refused with the demo password; no console errors (desktop + Pixel 7) |
| 2026-10-15 | Security headers deploy (`1944fd8`, D-039) | ✅ CSP (with `upgrade-insecure-requests`, no `unsafe-eval`), `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, COOP and Vercel's HSTS on `/` and `/login`; smoke test rerun 31/31, no console errors (so no CSP violations) |
| 2026-10-15 | M4 deploy (`dcbf0f4`, D-040) | ✅ smoke test 31/31, no console errors; `/login` serves its `h1` |
| 2026-10-15 | Handovers (`8523a48`) and audit log (`9c14a46`) deploys | ✅ smoke test 40/40 and 45/45 (read-only handover and audit checks added; phone menu closes after navigating); no console errors |
| 2026-10-16 | Migration 9 (`20261016000517_harden_after_independent_review`, D-043): `migration list`, `db push --dry-run`, `db push` (owner's terminal and explicit go-ahead) | ✅ list showed 8 applied + this one pending; dry run listed only it; applied |
| 2026-10-16 | `db advisors --linked` (owner) | ⚠️ one WARN, `auth_leaked_password_protection` (Auth, not schema): leaked-password checking is a Pro-plan feature, and the demo has signups disabled and passwords set by the seed (SECURITY.md §9). No database findings |
| 2026-10-16 | Review-fixes deploy (`ff04991`) | ✅ smoke test 45/45, no console errors; session cookie `sb-…-auth-token` is `HttpOnly`, `Secure`, `SameSite=Lax` (so the new cookie options are live) |
| 2026-10-16 | Owner housekeeping | ✅ `SUPABASE_DB_PASSWORD` and `DEMO_PASSWORD` unset in the owner's shell; ✅ scoped `aegir-cli` token revoked in the dashboard and `supabase logout` run; `projects list` now fails with `AccessTokenRequiredError` (a new scoped token is needed for `link` or other token commands) |

## Environments

| Environment | Database | App | Notes |
|---|---|---|---|
| Local | `npx supabase start` (Docker) | `npm run dev` | Seeded synthetic data; `db reset` allowed **only here** |
| Production (demo) | Supabase project "Aegir" (`ap-southeast-1`) ✅ | Vercel, https://aegir-eight.vercel.app ✅ | Migrations pushed from the repo; never edited in the dashboard |

## Prerequisites (provided by the owner, never pasted in chat)

- Supabase account + new project (region close to the target audience); database password stored in a password manager.
- **Scoped** Supabase personal access token for the CLI, not the full-account browser-login token. Scope: this project only; permissions **Project Settings, API Keys, API Key Secrets** (all Read, needed by `link`), **Projects (account-wide)** Read, **Migrations** Read, **Advisors** Read. No read-write permission: writes (`db push`, the demo seed) connect with the database password, which only the owner types. Short expiry; revoke after deployment. Save it with `npx supabase login --token "$(pbpaste)" --name aegir-cli` (keeps it out of shell history).
- Vercel account linked to the GitHub repo.

## Environment variables

| Variable | Local | Vercel | Exposure |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` | Production + Preview | Browser |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `.env.local` | Production + Preview | Browser |

No secret key is needed by the deployed app (D-002).

## First deployment (procedure; completed 2026-10-15)

1. `npx supabase link --project-ref <ref>`, then **confirm the target** (`npx supabase projects list`, which marks the linked one).
2. `npx supabase migration list` to compare local and remote history; investigate any drift before continuing.
3. `npx supabase db push --dry-run` to review the pending migrations, then `npx supabase db push`.
4. Verify: `migration list` matches; spot-check tables, policies and grants in Studio; run `npx supabase db advisors --linked`.
5. Hosted auth settings to match `config.toml`: **Email provider enabled** but **"Allow new users to sign up" disabled**, password policy (min 10, letters + digits), Site URL = Vercel URL, redirect URLs. Confirm that the Data API exposes only what our migrations grant (the hosted default may already be stricter; our migrations revoke and grant explicitly either way).
6. Seed the demo organization and users with `scripts/demo-seed.mjs` (D-011). Do **not** run `supabase/seed.sql` against production: its local password is published. The script prints `seed.sql` with that one password replaced by run-time psql variables: `demo_password` for the four published logins (manager, inspector, technician, viewer) and a random, never-published `private_password` for everyone else (admin, second technician, the second organization). It refuses a weak demo password, the local password, a missing variable, or a database that already has organizations. The owner runs it in their own terminal (the connection string is in the dashboard under **Connect**; type the database password when prompted):

   ```bash
   read -s DEMO_PASSWORD && export DEMO_PASSWORD   # ≥ 10 characters, letters and digits
   node scripts/demo-seed.mjs | psql "<session-pooler connection string>" \
     -v ON_ERROR_STOP=1 --single-transaction \
     -v demo_password="$DEMO_PASSWORD" -v private_password="$(openssl rand -base64 24)"
   unset DEMO_PASSWORD
   ```

   Verified locally on 2026-10-15 (`db reset --no-seed`, then the script): no password echoed; published logins sign in with the demo password and not the local one; the admin and the second organization are refused with it; a re-run, a weak password and a missing variable are refused; pgTAP 85/85 on the demo-seeded data (it is the fixture data). Publish the demo password in the README only once the demo is live.
7. Vercel: import the repo, set the env vars, deploy.
8. Smoke test the deployed URL: sign in as each demo role; dashboard numbers match the DB; create a vessel; viewer write rejected; another organization's IDs return not found. Check Vercel and Supabase logs for errors.
9. Record the URL and results here and in the README. ✅ 2026-10-15
10. Revoke the scoped access token once no further CLI work against the project is planned (owner).

## Subsequent deployments

Merge to `main` → Vercel builds. Apply any new migration **before** the app code that depends on it (`db push`, steps 2–4). Migrations are forward-only.

## Recovery

- App: roll back in Vercel to the previous deployment (instant).
- Schema: **forward-fix** with a new migration. Do not edit applied migrations. Destructive changes need explicit approval and a backup first (Supabase daily backups, or a `pg_dump` before risky changes).
- Demo data: `scripts/demo-reset.mjs` restores the demo to its seeded state (D-043). It deletes the two demo organizations' data and the seed's logins, then runs the demo seed unchanged, in **one transaction** (any failure leaves nothing changed). It refuses without `-v confirm=reset-demo` and on a database that holds any other organization. **Destructive:** every visitor change is lost, so it needs the owner's explicit approval each time, and a `pg_dump` first if anything should be kept. The owner runs it in their own terminal:

   ```bash
   read -s DEMO_PASSWORD && export DEMO_PASSWORD   # the published demo password, to keep it unchanged
   node scripts/demo-reset.mjs | psql "<session-pooler connection string>" \
     -v ON_ERROR_STOP=1 --single-transaction -v confirm=reset-demo \
     -v demo_password="$DEMO_PASSWORD" -v private_password="$(openssl rand -base64 24)"
   unset DEMO_PASSWORD
   ```

   Verified locally on 2026-10-16: after a visitor edit, two consecutive resets each restored exactly the seeded counts (2 organizations, 8 users, 8 vessels, 7 inspections, 7 work orders, 4 handovers, 68 audit events); a run without `confirm` and a run with a third organization present were both refused before any delete. Then rerun the smoke test.
