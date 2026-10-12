import { z } from "zod";

/**
 * Public (browser-safe) environment variables.
 *
 * Next.js inlines `NEXT_PUBLIC_*` values at build time only when they are
 * referenced literally (`process.env.NEXT_PUBLIC_X`), so each one is listed
 * explicitly instead of passing `process.env` wholesale.
 *
 * Never add a secret here: anything prefixed `NEXT_PUBLIC_` ships to the browser.
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export function parsePublicEnv(source: Record<string, string | undefined>): PublicEnv {
  const result = publicEnvSchema.safeParse(source);
  if (!result.success) {
    const missing = result.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(
      `Invalid public environment variables: ${missing}. Copy .env.example to .env.local and fill in the values.`,
    );
  }
  return result.data;
}

export const publicEnv = parsePublicEnv({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});
