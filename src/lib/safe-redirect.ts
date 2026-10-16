export const DEFAULT_AUTHENTICATED_PATH = "/dashboard";

const PLACEHOLDER_ORIGIN = "http://aegir.invalid";

/**
 * Turns an untrusted `next` value (query string, form field) into a same-site
 * path. Anything that could leave the site, such as `//evil.com`, `/\evil.com`
 * or `https://evil.com`, falls back to the dashboard (open-redirect protection).
 */
export function safeNextPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return DEFAULT_AUTHENTICATED_PATH;
  }

  let url: URL;
  try {
    url = new URL(value, PLACEHOLDER_ORIGIN);
  } catch {
    return DEFAULT_AUTHENTICATED_PATH;
  }

  // Dot segments can normalise "/..//evil.com" to "//evil.com", so check the result too.
  if (url.origin !== PLACEHOLDER_ORIGIN || url.pathname.startsWith("//") || url.pathname === "/login") {
    return DEFAULT_AUTHENTICATED_PATH;
  }

  return `${url.pathname}${url.search}${url.hash}`;
}
