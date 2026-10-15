# Deployment

> **Status: not deployed.** No hosted Supabase project or Vercel project is linked yet. Nothing below has been run against a remote environment.

## Environments

| Environment | Database | App | Notes |
|---|---|---|---|
| Local | `npx supabase start` (Docker) | `npm run dev` | Seeded synthetic data; `db reset` allowed **only here** |
| Production (demo) | Supabase Cloud project (⬜) | Vercel (⬜) | Migrations pushed from the repo; never edited in the dashboard |

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

## First deployment (planned procedure)

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
9. Record the URL and results here and in the README.

## Subsequent deployments

Merge to `main` → Vercel builds. Apply any new migration **before** the app code that depends on it (`db push`, steps 2–4). Migrations are forward-only.

## Recovery

- App: roll back in Vercel to the previous deployment (instant).
- Schema: **forward-fix** with a new migration. Do not edit applied migrations. Destructive changes need explicit approval and a backup first (Supabase daily backups, or a `pg_dump` before risky changes).
- Demo data: re-run the demo-seed script against the demo organization.
