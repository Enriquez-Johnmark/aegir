import { execFileSync } from "node:child_process";

/**
 * Every E2E run starts from the seed, so data created by earlier runs can't
 * change what the next run sees (lists, queues, figures).
 *
 * Always `--local`: this repository is linked to the hosted project, and a reset
 * there would destroy the live demo. Set E2E_SKIP_DB_RESET=1 to reuse the
 * current local data (e.g. when rerunning a single spec).
 */
export default function globalSetup() {
  if (process.env.E2E_SKIP_DB_RESET === "1") {
    return;
  }
  execFileSync("npx", ["supabase", "db", "reset", "--local"], { stdio: "inherit" });
}
