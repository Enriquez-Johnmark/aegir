import { describe, expect, it } from "vitest";

import { contentSecurityPolicy, securityHeaders } from "./security-headers";

const directives = (csp: string) => new Map(csp.split("; ").map((d) => [d.split(" ")[0], d] as const));

describe("contentSecurityPolicy", () => {
  it("locks down framing, plugins, base URLs, form targets and connections in production", () => {
    const csp = directives(contentSecurityPolicy({ isDev: false, upgradeInsecureRequests: true }));
    expect(csp.get("frame-ancestors")).toBe("frame-ancestors 'none'");
    expect(csp.get("object-src")).toBe("object-src 'none'");
    expect(csp.get("base-uri")).toBe("base-uri 'self'");
    expect(csp.get("form-action")).toBe("form-action 'self'");
    expect(csp.get("connect-src")).toBe("connect-src 'self'");
    expect(csp.get("script-src")).not.toContain("unsafe-eval");
    expect(csp.has("upgrade-insecure-requests")).toBe(true);
  });

  it("allows eval only in development, and never upgrades plain-http local builds", () => {
    expect(contentSecurityPolicy({ isDev: true, upgradeInsecureRequests: false })).toContain("'unsafe-eval'");
    expect(contentSecurityPolicy({ isDev: false, upgradeInsecureRequests: false })).not.toContain(
      "upgrade-insecure-requests",
    );
  });
});

describe("securityHeaders", () => {
  it("adds the anti-clickjacking, sniffing, referrer and permissions headers", () => {
    const headers = new Map(securityHeaders({ isDev: false, upgradeInsecureRequests: true }).map((h) => [h.key, h.value]));
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(headers.get("Permissions-Policy")).toContain("camera=()");
  });
});
