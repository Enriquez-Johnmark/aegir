import { describe, expect, it } from "vitest";

import { formatDate, formatDateTime, todayIsoDate } from "./format";

describe("format", () => {
  it("formats dates and UTC timestamps the same way everywhere", () => {
    expect(formatDate("2026-10-12")).toBe("12 Oct 2026");
    expect(formatDateTime("2026-10-15T08:58:41.123+00:00")).toBe("15 Oct 2026, 08:58 UTC");
    expect(formatDateTime("2026-10-15T23:30:00-02:00")).toBe("16 Oct 2026, 01:30 UTC");
    expect(formatDateTime(null)).toBe("—");
    expect(todayIsoDate(new Date("2026-10-15T23:59:00Z"))).toBe("2026-10-15");
  });
});
