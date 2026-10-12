import { describe, expect, it } from "vitest";

import { DEFAULT_AUTHENTICATED_PATH, safeNextPath } from "./safe-redirect";

describe("safeNextPath", () => {
  it("keeps same-site paths with query and hash", () => {
    expect(safeNextPath("/vessels?status=active#list")).toBe("/vessels?status=active#list");
  });

  it.each([
    ["missing", undefined],
    ["non-string", 42],
    ["empty", ""],
    ["relative", "vessels"],
    ["absolute URL", "https://evil.example/phish"],
    ["protocol-relative", "//evil.example"],
    ["backslash trick", "/\\evil.example"],
    ["javascript URL", "javascript:alert(1)"],
    ["login loop", "/login"],
  ])("falls back to the dashboard for %s", (_label, value) => {
    expect(safeNextPath(value)).toBe(DEFAULT_AUTHENTICATED_PATH);
  });
});
