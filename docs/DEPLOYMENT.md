# Deployment

> **Status: not deployed.** No hosted Supabase project or Vercel project is linked yet. Nothing below has been run against a remote environment.

## Environments

| Environment | Database | App | Notes |
|---|---|---|---|
| Local | `npx supabase start` (Docker) | `npm run dev` | Seeded synthetic data; `db reset` allowed **only here** |
| Production (demo) | Supabase Cloud project (⬜) | Vercel (⬜) | Migrations pushed from the repo; never edited in the dashboard |

## Prerequisites (provided by the owner, never pasted in chat)

- Supabase account + new project (region close to the target audience); database password stored in a password manager.
- **Scoped** Supabase personal access token for the CLI (`SUPABASE_ACCESS_TOKEN`), not the full-account browser-login token.
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
5. Hosted auth settings to match `config.toml`: sign-up disabled, password policy, Site URL = Vercel URL, redirect URLs.
6. Seed the demo organization and users with the reviewed demo-seed script (D-011), using the secret key from a local shell only.
7. Vercel: import the repo, set the env vars, deploy.
8. Smoke test the deployed URL: sign in as each demo role; dashboard numbers match the DB; create a vessel; viewer write rejected; another organization's IDs return not found. Check Vercel and Supabase logs for errors.
9. Record the URL and results here and in the README.

## Subsequent deployments

Merge to `main` → Vercel builds. Apply any new migration **before** the app code that depends on it (`db push`, steps 2–4). Migrations are forward-only.

## Recovery

- App: roll back in Vercel to the previous deployment (instant).
- Schema: **forward-fix** with a new migration. Do not edit applied migrations. Destructive changes need explicit approval and a backup first (Supabase daily backups, or a `pg_dump` before risky changes).
- Demo data: re-run the demo-seed script against the demo organization.
