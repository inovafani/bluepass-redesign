import { describe, expect, it } from "vitest";
import { realAccountWhere, realOperatorWhere, weekStart, weeklyBuckets } from "@/lib/services/admin/traction";

describe("weekStart", () => {
  it("is the Monday of the week, in UTC", () => {
    expect(weekStart(new Date("2026-10-22T15:30:00Z")).toISOString()).toBe("2026-10-19T00:00:00.000Z"); // a Thursday
    expect(weekStart(new Date("2026-10-19T00:00:00Z")).toISOString()).toBe("2026-10-19T00:00:00.000Z"); // a Monday
    expect(weekStart(new Date("2026-10-25T23:59:00Z")).toISOString()).toBe("2026-10-19T00:00:00.000Z"); // a Sunday
  });
});

describe("weeklyBuckets", () => {
  const now = new Date("2026-10-22T10:00:00Z");

  it("gives one bucket per week, oldest first, with quiet weeks shown as zero", () => {
    const buckets = weeklyBuckets([new Date("2026-10-20T09:00:00Z"), new Date("2026-10-21T09:00:00Z"), new Date("2026-10-06T09:00:00Z")], now, 4);
    expect(buckets).toEqual([
      { weekStart: "2026-09-28", count: 0 },
      { weekStart: "2026-10-05", count: 1 },
      { weekStart: "2026-10-12", count: 0 },
      { weekStart: "2026-10-19", count: 2 },
    ]);
  });

  it("ignores anything older than the window", () => {
    expect(weeklyBuckets([new Date("2025-01-01T00:00:00Z")], now, 4).every((bucket) => bucket.count === 0)).toBe(true);
  });
});

describe("what counts as real", () => {
  it("leaves out placeholder accounts and businesses named test", () => {
    const where = realOperatorWhere(false);
    expect(JSON.stringify(where)).toContain("@ops.bluepass.co");
    expect(JSON.stringify(where)).toContain("(test)");
  });

  it("counts everything when asked to include test data", () => {
    expect(realOperatorWhere(true)).toEqual({});
    expect(realAccountWhere(true)).toEqual({});
  });

  it("leaves test and placeholder traveller addresses out", () => {
    const text = JSON.stringify(realAccountWhere(false));
    for (const marker of ["@ops.bluepass.co", ".test", "@example.com"]) expect(text).toContain(marker);
  });
});
