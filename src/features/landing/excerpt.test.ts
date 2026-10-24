import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { RULE_EXCERPT, TEST_EXCERPT, excerptHref, type Excerpt } from "./excerpt";

function quotedLines({ path, lines: [first, last], dedent }: Excerpt): string {
  const file = readFileSync(join(process.cwd(), path), "utf8").split("\n");
  return file
    .slice(first - 1, last)
    .map((line) => line.slice(dedent))
    .join("\n");
}

describe("landing page code excerpts", () => {
  it.each([
    ["the work order transition rule", RULE_EXCERPT],
    ["its pgTAP test", TEST_EXCERPT],
  ])("%s quotes its file exactly, at the linked lines", (_, excerpt) => {
    expect(excerpt.code).toBe(quotedLines(excerpt));
  });

  it("links to the quoted lines on GitHub", () => {
    expect(excerptHref(TEST_EXCERPT)).toBe(
      "https://github.com/Enriquez-Johnmark/aegir/blob/main/supabase/tests/04_work_orders.test.sql#L53-L57",
    );
  });
});
