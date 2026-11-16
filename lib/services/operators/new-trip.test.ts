import { describe, expect, it } from "vitest";
import { parseNewTrip } from "./new-trip";

function form(over: Record<string, string | string[]> = {}) {
  const base: Record<string, string | string[]> = {
    title: "TEST Sunset Kayak",
    category: "Kayaking",
    region: "Brisbane",
    description: "A relaxed paddle at sunset around the bay.",
    weekday: ["2", "4", "6"],
    time: ["08:00"],
    capacity: "8",
    cutoffHours: "24",
    timezone: "Australia/Brisbane",
    amount: "A$100",
    meetingPoint: "Marina berth 12",
    intent: "publish",
    ...over,
  };
  const data = new FormData();
  for (const [key, value] of Object.entries(base)) for (const v of Array.isArray(value) ? value : [value]) data.append(key, v);
  return data;
}

describe("parseNewTrip: the one form a trip is made on", () => {
  it("reads a complete form into the listing, schedule, price and meeting point", () => {
    const r = parseNewTrip(form());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.values.listing).toMatchObject({ title: "TEST Sunset Kayak", maxGuests: 8, currency: "AUD" });
    expect(r.values.listing.priceFrom).toBeUndefined();
    expect(r.values.schedule).toMatchObject({ weekdays: [2, 4, 6], departureTimes: ["08:00"], capacityPerDeparture: 8, cutoffHours: 24, minGuests: 1 });
    expect(r.values.rate).toMatchObject({ label: "Adult", amount: 100, perGuest: true, isDefault: true });
    expect(r.values.meetingPoint).toBe("Marina berth 12");
    expect(r.values.publish).toBe(true);
  });

  it("saves as a draft when that button was pressed", () => {
    const r = parseNewTrip(form({ intent: "draft" }));
    expect(r.ok && r.values.publish).toBe(false);
  });

  it("names the field when something is missing or wrong, before anything is created", () => {
    expect(parseNewTrip(form({ amount: "" }))).toMatchObject({ ok: false, field: "amount", message: expect.stringContaining("price per guest") });
    expect(parseNewTrip(form({ amount: "0" }))).toMatchObject({ ok: false, field: "amount" });
    expect(parseNewTrip(form({ meetingPoint: " " }))).toMatchObject({ ok: false, field: "meetingPoint" });
    expect(parseNewTrip(form({ capacity: "" }))).toMatchObject({ ok: false, field: "capacity" });
    expect(parseNewTrip(form({ time: [] }))).toMatchObject({ ok: false, field: "time" });
    expect(parseNewTrip(form({ description: "short" }))).toMatchObject({ ok: false, field: "description" });
  });

  it("accepts prices typed the way operators type them", () => {
    for (const typed of ["189", "189.50", "A$189", "1,200"]) {
      expect(parseNewTrip(form({ amount: typed })).ok, typed).toBe(true);
    }
  });
});
