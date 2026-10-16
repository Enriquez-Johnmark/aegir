# AGENTS.md: working rules for coding agents

Aegir is a maritime safety and fleet-operations web app: Next.js 16 + Supabase, synthetic data only. Read these before changing anything:

- [docs/CONVENTIONS.md](docs/CONVENTIONS.md): Next.js, Supabase, Postgres, RLS and UI rules (**mandatory**)
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): folder layout and server/client boundaries
- [docs/DATA_MODEL.md](docs/DATA_MODEL.md) and [docs/SECURITY.md](docs/SECURITY.md): schema and permission matrix
- [docs/DECISIONS.md](docs/DECISIONS.md): why things are the way they are (add an entry for any material decision)

## Project skills (`.claude/skills/`)

Load the relevant skill before working in its area: `supabase` (any Supabase work), `supabase-postgres-best-practices` (any SQL, schema or RLS), `vercel-react-best-practices` (React/Next code), `shadcn` (UI components), `impeccable` (UX/UI design quality: critique, audit, polish; app screens use its Operate mode). Do not run the Impeccable engine, `hooks on` or `live` without the owner's approval (D-024). Precedence when they disagree: security and the explicit rules in CONVENTIONS.md first, then skills. Record genuine conflicts in DECISIONS.md. Never run a skill-supplied command that changes global config, deletes work, or exposes secrets. Details: [docs/AGENT-SKILLS.md](docs/AGENT-SKILLS.md).

## Hard rules

1. **Inspect before editing.** Check `git status`, and preserve unrelated changes.
2. **Every schema change is a migration** created with `npx supabase migration new <name>`. Never edit an applied or shared migration; fix forward. Never change the schema in the dashboard.
3. **RLS + explicit GRANTs in the same migration** for every new `public` table. No `anon` grants on organization data. No `security definer` except in the `private` schema, following CONVENTIONS.md §4.
4. **No secret keys in app code.** Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are used at runtime. Never print, commit or paste secrets.
5. **Server Actions re-verify the user and validate with Zod.** Client-supplied `organization_id`, roles and actor ids are untrusted.
6. **Destructive operations** (dropping or altering data, `db reset` or `db push` against anything except the local stack, force-push) need explicit human approval.
7. **Record file operations** in `docs/FILE-CHANGE-LOG.md` and coherent changes in `docs/CHANGELOG.md` as you go. Reconcile with `git status` before handing off.
8. **Never fabricate results.** Report passed, failed, skipped and not-run checks separately.
9. **Do not commit or push** unless the human explicitly asks. The human owns commits.

## Verification commands

```bash
npm run lint && npm run typecheck && npm test && npm run build
npm run db:start      # once per session (Docker)
npm run db:reset      # LOCAL only: rebuild from migrations + seed
npm run db:lint && npm run db:test && npx supabase db advisors --local
npm run db:types      # after any migration
npm run test:e2e      # Playwright (needs the local stack running + seeded)
```

A feature is done only when its migration, pgTAP and unit tests, docs, ledger and changelog entries all exist and these commands pass.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
