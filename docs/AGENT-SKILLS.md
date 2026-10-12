# Agent Skills

Project-local Claude Code skills, installed **2026-10-12** with `npx skills@1.7.2 add <repo> --skill <name> --agent claude-code --copy -y` (project scope, **no** `-g`). `--copy` stores real files in the repo rather than symlinks to a machine-local cache. `skills-lock.json` records the source and a content hash for each skill.

| Skill (installed name) | Path | Source repo | Upstream path | Skill version | Upstream commit (latest touching the skill path, at install) |
|---|---|---|---|---|---|
| `supabase` | `.claude/skills/supabase/` | `supabase/agent-skills` | `skills/supabase` | 0.1.2 | `c9be0e931b7930f7d02126d04774d904c381e7d7` |
| `supabase-postgres-best-practices` | `.claude/skills/supabase-postgres-best-practices/` | `supabase/agent-skills` | `skills/supabase-postgres-best-practices` | 1.1.1 | `1207767388a0ffb55f21fb4e6988fee96942431d` |
| `vercel-react-best-practices` | `.claude/skills/vercel-react-best-practices/` | `vercel-labs/agent-skills` | `skills/react-best-practices` | 1.0.0 | `dc8367e6f91c022d83361f03c3313fa05e848ee5` |
| `shadcn` | `.claude/skills/shadcn/` | `shadcn-ui/ui` | `skills/shadcn` | n/a | `2d3f1cd436b18ea12f24130de4df781355925b08` |

## Verification (2026-10-12)

- [x] All four directories exist with `SKILL.md` and their reference files (136 files total). No symlinks.
- [x] Every `SKILL.md` read; key references read (RLS, privileges, PKs, FK indexes, data types, constraints).
- [x] Executable content reviewed: only `shadcn/scripts/showcase-coverage.mjs` (read-only file scanner). The `shadcn` SKILL.md runs `` !`npx shadcn@latest info --json` `` on load (read-only) and pre-approves `npx shadcn@latest *` (see D-014).
- [x] Claude Code discovers all four skills from this repo (they appear in the session's skill list).
- [x] Global skill directories (`~/.claude/skills`, `~/.agents/skills`) compared before and after install: unchanged.

## Responsibilities

| Skill | Use for |
|---|---|
| `supabase` | Auth/SSR clients, CLI workflows, migrations workflow, Data API exposure, security checklist, debugging (fetch Supabase docs first) |
| `supabase-postgres-best-practices` | Schema design, types, constraints, indexes, RLS policy design and performance, locking, query plans |
| `vercel-react-best-practices` | Server/client boundaries, waterfalls, Suspense, bundle size, re-render hygiene |
| `shadcn` | Component install and composition, forms (`Field`), theming, accessibility rules |

## Conflicts and resolutions

| Topic | Conflict | Resolution |
|---|---|---|
| Primary keys | Postgres skill prefers identity/UUIDv7 | D-004 |
| Migration authoring | `supabase` skill: iterate + `db pull`; brief: hand-authored `migration new` | D-008 |
| `force row level security` | Postgres skill example forces RLS | D-010 |
| Unpinned `@latest` CLI in shadcn skill | Reproducibility | D-014 |

## Updating skills

1. `npx skills@<pinned> update -p` **in a branch**.
2. Review `git diff .claude/skills skills-lock.json`: new instructions, new scripts, changed shell directives.
3. Record the update here (date, new commit) and in CHANGELOG/FILE-CHANGE-LOG.

## Other agents

Codex and other agents do not read `.claude/skills/` automatically. `AGENTS.md` tells them where the skills are. Configure any second agent's skill discovery separately and verify it.
