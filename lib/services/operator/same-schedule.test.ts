import { describe, expect, it } from "vitest";
import { sameSchedule, type SchedulePattern } from "./same-schedule";

const base: SchedulePattern = {
  weekdays: [2, 4, 6],
  departureTimes: ["08:00"],
  capacityPerDeparture: 12,
  minGuests: 1,
  cutoffHours: 24,
  maxAdvanceDays: 365,
  timezone: "Australia/Brisbane",
  seasonStart: null,
  seasonEnd: null,
};

describe("sameSchedule", () => {
  it("treats the same pattern as the same, whatever the order of days and times", () => {
    expect(sameSchedule(base, { ...base, weekdays: [6, 2, 4] })).toBe(true);
    expect(sameSchedule({ ...base, departureTimes: ["08:00", "14:00"] }, { ...base, departureTimes: ["14:00", "08:00"] })).toBe(true);
  });

  it("tells patterns apart by any rule", () => {
    expect(sameSchedule(base, { ...base, weekdays: [0, 2, 4, 6] })).toBe(false);
    expect(sameSchedule(base, { ...base, departureTimes: ["09:00"] })).toBe(false);
    expect(sameSchedule(base, { ...base, capacityPerDeparture: 10 })).toBe(false);
    expect(sameSchedule(base, { ...base, minGuests: 2 })).toBe(false);
    expect(sameSchedule(base, { ...base, cutoffHours: 2 })).toBe(false);
    expect(sameSchedule(base, { ...base, maxAdvanceDays: 10 })).toBe(false);
    expect(sameSchedule(base, { ...base, timezone: "Australia/Perth" })).toBe(false);
  });

  it("compares seasons by the instant, and a missing season only equals a missing season", () => {
    const dec = new Date("2026-12-01T00:00:00Z");
    expect(sameSchedule({ ...base, seasonStart: dec }, { ...base, seasonStart: new Date(dec) })).toBe(true);
    expect(sameSchedule({ ...base, seasonStart: dec }, base)).toBe(false);
    expect(sameSchedule({ ...base, seasonEnd: dec }, { ...base, seasonEnd: new Date("2026-12-02T00:00:00Z") })).toBe(false);
  });
});
