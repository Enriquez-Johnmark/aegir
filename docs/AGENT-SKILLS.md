# Agent Skills

Project-local Claude Code skills, installed **2026-10-12** with `npx skills@1.7.2 add <repo> --skill <name> --agent claude-code --copy -y` (project scope, **no** `-g`). `--copy` stores real files in the repo rather than symlinks to a machine-local cache. `skills-lock.json` records the source and a content hash for each skill.

| Skill (installed name) | Path | Source repo | Upstream path | Skill version | Upstream commit (latest touching the skill path, at install) |
|---|---|---|---|---|---|
| `supabase` | `.claude/skills/supabase/` | `supabase/agent-skills` | `skills/supabase` | 0.1.2 | `c9be0e931b7930f7d02126d04774d904c381e7d7` |
| `supabase-postgres-best-practices` | `.claude/skills/supabase-postgres-best-practices/` | `supabase/agent-skills` | `skills/supabase-postgres-best-practices` | 1.1.1 | `1207767388a0ffb55f21fb4e6988fee96942431d` |
| `vercel-react-best-practices` | `.claude/skills/vercel-react-best-practices/` | `vercel-labs/agent-skills` | `skills/react-best-practices` | 1.0.0 | `dc8367e6f91c022d83361f03c3313fa05e848ee5` |
| `shadcn` | `.claude/skills/shadcn/` | `shadcn-ui/ui` | `skills/shadcn` | n/a | `2d3f1cd436b18ea12f24130de4df781355925b08` |
| `impeccable` (added 2026-10-12, M2→M3) | `.claude/skills/impeccable/` | `pbakaus/impeccable` ([impeccable.style](https://impeccable.style/), Apache-2.0) | `.agents/skills/impeccable` | 4.5.2 (engine 0.1.14) | `d631a8827f99414d2b6daba4ef08b7f8701751d7` |

## Verification (2026-10-12)

- [x] All four directories exist with `SKILL.md` and their reference files (136 files total). No symlinks.
- [x] Every `SKILL.md` read; key references read (RLS, privileges, PKs, FK indexes, data types, constraints).
- [x] Executable content reviewed: only `shadcn/scripts/showcase-coverage.mjs` (read-only file scanner). The `shadcn` SKILL.md runs `` !`npx shadcn@latest info --json` `` on load (read-only) and pre-approves `npx shadcn@latest *` (see D-014).
- [x] Claude Code discovers all four skills from this repo (they appear in the session's skill list).
- [x] Global skill directories (`~/.claude/skills`, `~/.agents/skills`) compared before and after install: unchanged.

### Impeccable verification (2026-10-12)

- [x] Installed with `npx skills@1.7.2 add pbakaus/impeccable --skill impeccable --agent claude-code --copy -y` (project scope, copies). 62 files, no symlinks. `skills-lock.json` updated.
- [x] Claude Code discovers it (appears in the session skill list).
- [x] Global skill directories unchanged. `~/.impeccable` already existed from earlier use elsewhere (2026-09/10, engine 0.1.5); nothing in it changed.
- [x] `SKILL.md` read in full (85 lines): modes (Persuade/Operate/Read/Experience), commands, routing, hooks, doctor.
- [x] Executable content reviewed:
  - `scripts/impeccable` (POSIX launcher). It runs, in order, `$IMPECCABLE_BIN`, a bundled binary (none shipped), `~/.impeccable/bin/impeccable`, a version cache, or `impeccable` on PATH. **Otherwise it downloads `impeccable-<os>-<arch>` for engine 0.1.14 from GitHub Releases into `~/.impeccable/bin/0.1.14/`** and fails closed unless it matches the published `.sha256` sidecar (an integrity check from the same origin, not a signature).
  - `scripts/live-browser*.js`: injected into the local dev page in `live` mode; network calls go only to its own `localhost` helper server and asset URLs.
  - `scripts/modern-screenshot.umd.js` (bundled screenshot library) and `scripts/data/font-index.json` (font metadata) are data/library files.
  - `agents/*.toml`: Codex subagent definitions (finish reviewer, documenter, asset producer, manual-edit applier). Claude Code does not load them.
  - `reference/hooks.md`: `impeccable hooks on` writes `.impeccable/config.json` and a PostToolUse/Stop hook in `.claude/settings.local.json` (git-ignored). **Not enabled** at install time (D-024; enabled later with approval, next line).
- [x] Engine and hooks enabled with the owner's approval (D-024): engine 0.1.14 SHA-256 verified against the published sidecar; `hooks on` installed the PostToolUse + Stop hooks in git-ignored `.claude/settings.local.json`. The hook fires on Edit/Write of UI files (verified). `live` mode not used.
- [x] `impeccable document` run in scan mode → `DESIGN.md` + `.impeccable/design.json` (D-026). `impeccable detect` over all changed UI: no findings.

## Responsibilities

| Skill | Use for |
|---|---|
| `supabase` | Auth/SSR clients, CLI workflows, migrations workflow, Data API exposure, security checklist, debugging (fetch Supabase docs first) |
| `supabase-postgres-best-practices` | Schema design, types, constraints, indexes, RLS policy design and performance, locking, query plans |
| `vercel-react-best-practices` | Server/client boundaries, waterfalls, Suspense, bundle size, re-render hygiene |
| `shadcn` | Component install and composition, forms (`Field`), theming, accessibility rules |
| `impeccable` | UX/UI design quality: `critique` (heuristic UX review), `audit` (a11y, performance, responsive), `polish`, `harden` (errors, edge cases, empty states), `clarify` (UX copy), `layout`, `typeset`, `adapt`; design-system capture via `document` (DESIGN.md) |

## Conflicts and resolutions

| Topic | Conflict | Resolution |
|---|---|---|
| Primary keys | Postgres skill prefers identity/UUIDv7 | D-004 |
| Migration authoring | `supabase` skill: iterate + `db pull`; brief: hand-authored `migration new` | D-008 |
| `force row level security` | Postgres skill example forces RLS | D-010 |
| Unpinned `@latest` CLI in shadcn skill | Reproducibility | D-014 |
| Impeccable "go all out / be bold" vs shadcn "built-in variants, semantic tokens" | Aegir is an operational app | D-024: Operate mode; shadcn rules win for component implementation |
| Impeccable expects `PRODUCT.md` at the repo root; ours is `docs/PRODUCT.md` | One product authority | D-025 |
| Impeccable launcher downloads a native engine binary to `~/.impeccable` | Supply chain, global side effect | D-024: engine and hooks are opt-in |

## Updating skills

1. `npx skills@<pinned> update -p` **in a branch**.
2. Review `git diff .claude/skills skills-lock.json`: new instructions, new scripts, changed shell directives.
3. Record the update here (date, new commit) and in CHANGELOG/FILE-CHANGE-LOG.

## Other agents

Codex and other agents do not read `.claude/skills/` automatically. `AGENTS.md` tells them where the skills are. Configure any second agent's skill discovery separately and verify it.
