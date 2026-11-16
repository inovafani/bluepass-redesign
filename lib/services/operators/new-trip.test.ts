import { describe, expect, it } from "vitest";
import { parseNewTrip } from "./new-trip";

const pattern = { weekdays: [2, 4, 6], times: ["08:00"], capacity: "8", minGuests: "1", cutoffHours: "24", maxAdvanceDays: "365", timezone: "Australia/Brisbane", seasonStart: "", seasonEnd: "" };
const adult = { label: "Adult", amount: "A$100", per: "guest", isDefault: true, minAge: "", maxAge: "", seasonStart: "", seasonEnd: "" };

/** Plain fields as strings; the lists as the JSON the form sends. */
function form(over: Record<string, unknown> = {}) {
  const base: Record<string, unknown> = {
    title: "TEST Sunset Kayak",
    category: "Kayaking",
    region: "Brisbane",
    description: "A relaxed paddle at sunset around the bay.",
    meetingPoint: "Marina berth 12",
    intent: "publish",
    schedules: [pattern],
    oneOffs: [],
    rates: [adult],
    closed: [],
    gallery: [],
    ...over,
  };
  const data = new FormData();
  for (const [key, value] of Object.entries(base)) data.append(key, typeof value === "string" ? value : JSON.stringify(value));
  return data;
}

describe("parseNewTrip: the one form a trip is made on", () => {
  it("reads a complete form into the listing, schedule, price and meeting point", () => {
    const r = parseNewTrip(form());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.values.listing).toMatchObject({ title: "TEST Sunset Kayak", maxGuests: 8, currency: "AUD" });
    expect(r.values.listing.priceFrom).toBeUndefined();
    expect(r.values.schedules).toHaveLength(1);
    expect(r.values.schedules[0]).toMatchObject({ weekdays: [2, 4, 6], departureTimes: ["08:00"], capacityPerDeparture: 8, cutoffHours: 24, minGuests: 1, maxAdvanceDays: 365 });
    expect(r.values.rates[0]).toMatchObject({ label: "Adult", amount: 100, perGuest: true, isDefault: true });
    expect(r.values.meetingPoint).toBe("Marina berth 12");
    expect(r.values.publish).toBe(true);
  });

  it("saves as a draft when that button was pressed", () => {
    const r = parseNewTrip(form({ intent: "draft" }));
    expect(r.ok && r.values.publish).toBe(false);
  });

  it("names the field when something is missing or wrong, before anything is created", () => {
    expect(parseNewTrip(form({ rates: [{ ...adult, amount: "" }] }))).toMatchObject({ ok: false, field: "amount", message: expect.stringContaining("enter the price") });
    expect(parseNewTrip(form({ rates: [{ ...adult, amount: "0" }] }))).toMatchObject({ ok: false, field: "amount" });
    expect(parseNewTrip(form({ rates: [] }))).toMatchObject({ ok: false, field: "amount" });
    expect(parseNewTrip(form({ meetingPoint: " " }))).toMatchObject({ ok: false, field: "meetingPoint" });
    expect(parseNewTrip(form({ schedules: [{ ...pattern, capacity: "" }] }))).toMatchObject({ ok: false, field: "capacity" });
    expect(parseNewTrip(form({ schedules: [{ ...pattern, times: [] }] }))).toMatchObject({ ok: false, field: "time" });
    expect(parseNewTrip(form({ schedules: [], oneOffs: [] }))).toMatchObject({ ok: false, field: "schedule" });
    expect(parseNewTrip(form({ description: "short" }))).toMatchObject({ ok: false, field: "description" });
  });

  it("accepts prices typed the way operators type them", () => {
    for (const typed of ["189", "189.50", "A$189", "1,200"]) {
      expect(parseNewTrip(form({ rates: [{ ...adult, amount: typed }] })).ok, typed).toBe(true);
    }
  });

  it("reads trip length and the note for every guest, and leaves both empty when blank", () => {
    const blank = parseNewTrip(form());
    expect(blank.ok && blank.values.durationMinutes).toBe(null);
    expect(blank.ok && blank.values.confirmationNote).toBe(null);
    const set = parseNewTrip(form({ hours: "2", minutes: "30", confirmationNote: "Bring a hat." }));
    expect(set.ok && set.values.durationMinutes).toBe(150);
    expect(set.ok && set.values.confirmationNote).toBe("Bring a hat.");
    expect(parseNewTrip(form({ hours: "0", minutes: "5" }))).toMatchObject({ ok: false, field: "durationMinutes" });
  });

  it("takes several schedules and one-off departures, and sizes the trip to its biggest departure", () => {
    const r = parseNewTrip(
      form({
        schedules: [pattern, { ...pattern, weekdays: [0], times: ["13:00"], capacity: "20", seasonStart: "2026-12-01", seasonEnd: "2027-02-28" }],
        oneOffs: [{ date: "2026-12-31", time: "17:00", capacity: "30", timezone: "Australia/Brisbane" }],
      }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.values.schedules).toHaveLength(3);
    expect(r.values.schedules[1]).toMatchObject({ seasonStart: "2026-12-01", seasonEnd: "2027-02-28" });
    expect(r.values.schedules[2]).toMatchObject({ weekdays: [], seasonStart: "2026-12-31", seasonEnd: "2026-12-31", capacityPerDeparture: 30 });
    expect(r.values.listing.maxGuests).toBe(30);
  });

  it("refuses an extra schedule with no day ticked, a season upside down, and a minimum above the boat", () => {
    expect(parseNewTrip(form({ schedules: [pattern, { ...pattern, weekdays: [] }] }))).toMatchObject({ ok: false, message: expect.stringContaining("Schedule 2: pick at least one day") });
    expect(parseNewTrip(form({ schedules: [{ ...pattern, seasonStart: "2027-03-01", seasonEnd: "2027-02-01" }] }))).toMatchObject({ ok: false });
    expect(parseNewTrip(form({ schedules: [{ ...pattern, minGuests: "9" }] }))).toMatchObject({ ok: false, message: expect.stringContaining("more than the boat holds") });
    expect(parseNewTrip(form({ oneOffs: [{ date: "", time: "17:00", capacity: "10", timezone: "Australia/Brisbane" }] }))).toMatchObject({ ok: false, message: expect.stringContaining("pick a date") });
  });

  it("takes several prices with exactly one default, and refuses an upside-down age band", () => {
    const child = { label: "Child", amount: "60", per: "guest", isDefault: false, minAge: "3", maxAge: "12", seasonStart: "", seasonEnd: "" };
    const charter = { label: "Private charter", amount: "900", per: "booking", isDefault: false, minAge: "", maxAge: "", seasonStart: "", seasonEnd: "" };
    const r = parseNewTrip(form({ rates: [{ ...adult, isDefault: false }, { ...child, isDefault: true }, charter] }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.values.rates.map((x) => x.isDefault)).toEqual([false, true, false]);
    expect(r.values.rates[1]).toMatchObject({ minAge: 3, maxAge: 12 });
    expect(r.values.rates[2]).toMatchObject({ perGuest: false, amount: 900 });
    // Nobody marked as default: the first one is.
    const none = parseNewTrip(form({ rates: [{ ...adult, isDefault: false }, child] }));
    expect(none.ok && none.values.rates.map((x) => x.isDefault)).toEqual([true, false]);
    expect(parseNewTrip(form({ rates: [{ ...child, minAge: "12", maxAge: "3" }] }))).toMatchObject({ ok: false, message: expect.stringContaining("upside down") });
  });

  it("reads closed dates (a single day closes just that day) and the gallery", () => {
    const r = parseNewTrip(form({ closed: [{ startDate: "2026-12-25", endDate: "", reason: "Christmas" }, { startDate: "2027-01-10", endDate: "2027-01-14", reason: "" }], gallery: [{ url: "https://a.supabase.co/x.jpg" }, { url: "https://a.supabase.co/x.jpg" }] }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.values.closedDates).toEqual([
      { startDate: "2026-12-25", endDate: "2026-12-25", reason: "Christmas" },
      { startDate: "2027-01-10", endDate: "2027-01-14", reason: null },
    ]);
    expect(r.values.gallery).toEqual(["https://a.supabase.co/x.jpg"]);
    expect(parseNewTrip(form({ closed: [{ startDate: "2026-12-25", endDate: "2026-12-20", reason: "" }] }))).toMatchObject({ ok: false, field: "closed" });
    expect(parseNewTrip(form({ gallery: Array.from({ length: 13 }, (_, i) => ({ url: `https://a.supabase.co/${i}.jpg` })) }))).toMatchObject({ ok: false, field: "gallery" });
  });

  it("carries the custom price text and the busy calendar", () => {
    const r = parseNewTrip(form({ priceSignal: "From AUD 100", busyCalendarId: "cal-1" }));
    expect(r.ok && r.values.listing.priceSignal).toBe("From AUD 100");
    expect(r.ok && r.values.busyCalendarId).toBe("cal-1");
  });
});
