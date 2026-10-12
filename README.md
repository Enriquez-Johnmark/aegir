# Aegir

**Maritime safety and fleet operations management.** Vessels, safety inspections, work orders and shift handovers in one audited, multi-tenant workspace.

> Portfolio project, under active development. Synthetic data only. Aegir is **not** a certified maritime safety system and makes no regulatory compliance claims.

**Status:** foundation in place (M1). The schema, auth and features are in progress; see the [roadmap](docs/ROADMAP.md). Live demo: _not yet deployed_.

## Features (MVP scope)

| Area | Status |
|---|---|
| Next.js 16 + Supabase SSR foundation, env validation | ✅ |
| Auth, organizations, role-based access, RLS | ⬜ |
| Vessels: list, search, detail, create, edit | ⬜ |
| Inspections with checklists and failed-check follow-up | ⬜ |
| Work orders with enforced status transitions | ⬜ |
| Task handovers with acknowledgement | ⬜ |
| Tamper-resistant audit history | ⬜ |
| Live operational dashboard | ⬜ |

## Tech stack

Next.js 16 (App Router, Cache Components) · React 19 · TypeScript (strict) · Tailwind CSS v4 · shadcn/ui (Base UI) · Zod · Supabase (Auth, Postgres 17, RLS) · Supabase CLI · Vitest · pgTAP · Playwright (planned) · Vercel (planned)

## Getting started

Prerequisites: Node ≥ 22 (`.nvmrc` pins 24), Docker running.

```bash
npm ci
npm run db:start                      # local Supabase in Docker (first run downloads images)
cp .env.example .env.local            # then paste the API URL + publishable key from:
npx supabase status
npm run dev                           # http://localhost:3000
```

### Environment variables

| Name | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key (browser-safe; data is protected by RLS) |

The app never uses a secret or service-role key at runtime.

## Database workflow

Migrations in `supabase/migrations/` are the single source of truth.

```bash
npx supabase migration new <descriptive_name>   # create a migration file
npm run db:reset                                 # rebuild the LOCAL db from migrations + seed
npm run db:lint && npm run db:test               # lint SQL, run pgTAP (RLS) tests
npm run db:types                                 # regenerate src/types/database.types.ts
```

Applied migrations are never edited; changes go forward in new migrations. See [CONVENTIONS.md §4](docs/CONVENTIONS.md#4-database-and-migrations-postgres).

## Testing

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

Strategy and latest results: [docs/TESTING.md](docs/TESTING.md).

## Documentation

| Doc | Contents |
|---|---|
| [PRODUCT](docs/PRODUCT.md) | Users, workflows, scope, exclusions |
| [ARCHITECTURE](docs/ARCHITECTURE.md) | System design, **folder layout**, boundaries, data flow |
| [CONVENTIONS](docs/CONVENTIONS.md) | Next.js, Supabase, Postgres, RLS and UI best practices used here |
| [DATA_MODEL](docs/DATA_MODEL.md) | Tables, constraints, indexes, lifecycle |
| [SECURITY](docs/SECURITY.md) | Auth, role matrix, RLS, secrets, audit integrity |
| [TESTING](docs/TESTING.md) · [DEPLOYMENT](docs/DEPLOYMENT.md) | How it's verified and shipped |
| [DECISIONS](docs/DECISIONS.md) | Architecture decision record |
| [ROADMAP](docs/ROADMAP.md) · [CHANGELOG](docs/CHANGELOG.md) · [FILE-CHANGE-LOG](docs/FILE-CHANGE-LOG.md) | Progress and change history |
| [AGENT-SKILLS](docs/AGENT-SKILLS.md) | AI coding-assistant skills used in this repo |

## Demo access

Planned: seeded, non-privileged demo accounts ([D-011](docs/DECISIONS.md#d-011)).

## Known limitations

- Early development: most features are not built yet (see the table above).
- Not deployed yet.
- `npm audit` flags a dev-only lint dependency (`braces` via `eslint-config-next`); see [SECURITY.md §9](docs/SECURITY.md#9-known-risks-and-limitations).
