import { fileURLToPath } from "node:url";

import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

// Integration tests (D-049): Server Actions and the data layer against the LOCAL
// Supabase stack, signed in as seeded users. `npm test` never runs these.
const env = loadEnv("test", process.cwd(), "NEXT_PUBLIC_SUPABASE_");
const host = URL.parse(env.NEXT_PUBLIC_SUPABASE_URL ?? "")?.hostname;
if (host !== "127.0.0.1" && host !== "localhost") {
  // This repository is linked to the hosted project: never run writes against it.
  throw new Error("Integration tests run only against the local Supabase stack (127.0.0.1 or localhost).");
}
// Global setup runs in this process and signs the seeded users in.
Object.assign(process.env, env);

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // The real package throws outside a React Server Components build.
      "server-only": fileURLToPath(new URL("./integration/support/server-only.ts", import.meta.url)),
    },
  },
  test: {
    include: ["integration/**/*.test.ts"],
    environment: "node",
    env,
    globalSetup: ["./integration/support/global-setup.ts"],
    setupFiles: ["./integration/support/next-runtime.ts"],
    // One shared database: files run one after another.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 180_000,
  },
});
