/**
 * HTTP security headers for every response (D-039), applied from next.config.ts.
 *
 * Content-Security-Policy without nonces: Aegir prerenders static shells (Cache
 * Components / Partial Prerendering), which nonce-based CSP can't serve, and the
 * streamed React payload is inline script, so `script-src` keeps 'unsafe-inline'
 * (the Next.js guide's "Without Nonces" policy). Everything else is locked down.
 *
 * `connect-src 'self'`: the browser never talks to Supabase directly; every read
 * and write goes through Server Components and Server Actions. If the browser
 * Supabase client (src/lib/supabase/client.ts) is ever used, add its origin here.
 */
export function contentSecurityPolicy({
  isDev,
  upgradeInsecureRequests,
}: {
  isDev: boolean;
  /** Only on HTTPS deployments; local production builds are served over http://127.0.0.1. */
  upgradeInsecureRequests: boolean;
}): string {
  const directives = [
    "default-src 'self'",
    // React uses eval for richer error stacks in development only.
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(upgradeInsecureRequests ? ["upgrade-insecure-requests"] : []),
  ];
  return directives.join("; ");
}

export function securityHeaders(options: Parameters<typeof contentSecurityPolicy>[0]) {
  return [
    { key: "Content-Security-Policy", value: contentSecurityPolicy(options) },
    // Legacy companion to frame-ancestors (clickjacking).
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ];
}
