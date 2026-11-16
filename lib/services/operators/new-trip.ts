import { operatorListingInputSchema, type OperatorListingInput } from "@/lib/services/operators/operator-listing-service";
import { oneOffSchedule, rateInputSchema, scheduleInputSchema, type RateInput, type ScheduleInput } from "@/lib/services/rails/setup";

/**
 * The one form a new trip is made on: everything the trip's own page and its setup page used to ask
 * for, in one go. Read here, apart from the database, so a bad answer is named before anything is
 * created. The lists (schedules, prices, closed dates, gallery) arrive as JSON from the form.
 */
export type NewTripValues = {
  listing: OperatorListingInput;
  /** Weekly patterns first, then one-off departures. */
  schedules: ScheduleInput[];
  /** In the order given; exactly one is the default. */
  rates: RateInput[];
  closedDates: { startDate: string; endDate: string; reason: string | null }[];
  gallery: string[];
  busyCalendarId: string | null;
  meetingPoint: string;
  /** Null when left blank; the same limits as the trip page apply when it is saved. */
  durationMinutes: number | null;
  confirmationNote: string | null;
  publish: boolean;
};

export type NewTripParse = { ok: true; values: NewTripValues } | { ok: false; message: string; field?: string };

export const MEETING_POINT_MAX = 200;
export const MAX_GALLERY_PHOTOS = 12;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const text = (form: FormData, name: string) => {
  const v = form.get(name);
  return typeof v === "string" ? v.trim() : "";
};

const str = (v: unknown) => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "");

/** Blank is "not given", never zero. */
function whole(v: unknown): number | null {
  const s = str(v);
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n) : Number.NaN;
}

/** "A$189", "189.50" and "1,200" all read; anything without digits is NaN so the field gets the error. */
function price(v: unknown): number {
  const s = str(v).replace(/[,\s]/g, "").replace(/^[A-Z$]+/i, "");
  return s === "" ? Number.NaN : Number(s);
}

function list(form: FormData, name: string): Record<string, unknown>[] {
  try {
    const v = JSON.parse(text(form, name) || "[]");
    return Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null) : [];
  } catch {
    return [];
  }
}

const fail = (message: string, field?: string): { ok: false; message: string; field?: string } => ({ ok: false, message, field });

/** The schedule schema names its fields one way; the form names them another. */
const FORM_FIELD: Record<string, string> = { capacityPerDeparture: "capacity", departureTimes: "time", weekdays: "weekday" };

export function parseNewTrip(form: FormData): NewTripParse {
  const patterns = list(form, "schedules");
  const oneOffs = list(form, "oneOffs");
  const several = patterns.length + oneOffs.length > 1;

  // --- when it runs ---------------------------------------------------------------------------
  if (patterns.length + oneOffs.length === 0) return fail("Say when the trip runs: add at least one schedule.", "schedule");
  const schedules: ScheduleInput[] = [];

  for (const [i, p] of patterns.entries()) {
    const where = several ? `Schedule ${i + 1}: ` : "";
    const weekdays = Array.isArray(p.weekdays) ? p.weekdays.map(Number) : [];
    // No days means every day: right for a first pattern, a trap for an extra one.
    if (i > 0 && weekdays.length === 0) return fail(`${where}pick at least one day.`, "schedule");
    const r = scheduleInputSchema.safeParse({
      weekdays,
      departureTimes: (Array.isArray(p.times) ? p.times : []).map(str).filter(Boolean),
      capacityPerDeparture: whole(p.capacity) ?? Number.NaN,
      minGuests: whole(p.minGuests) ?? 1,
      cutoffHours: whole(p.cutoffHours) ?? 24,
      maxAdvanceDays: whole(p.maxAdvanceDays) ?? 365,
      timezone: str(p.timezone),
      seasonStart: str(p.seasonStart) || null,
      seasonEnd: str(p.seasonEnd) || null,
    });
    if (!r.success) {
      const issue = r.error.issues[0];
      const path = String(issue?.path[0] ?? "");
      return fail(`${where}${issue?.message ?? "check when the trip runs."}`, FORM_FIELD[path] ?? path);
    }
    if (r.data.seasonStart && r.data.seasonEnd && r.data.seasonEnd < r.data.seasonStart) return fail(`${where}the season ends before it starts.`, "schedule");
    if (r.data.minGuests > r.data.capacityPerDeparture) return fail(`${where}the minimum to run is more than the boat holds.`, "schedule");
    schedules.push(r.data);
  }

  for (const [i, o] of oneOffs.entries()) {
    const where = `One-off departure ${i + 1}: `;
    const date = str(o.date);
    if (!DATE.test(date)) return fail(`${where}pick a date.`, "schedule");
    const r = scheduleInputSchema.safeParse(oneOffSchedule({ date, time: str(o.time), capacity: whole(o.capacity) ?? Number.NaN, timezone: str(o.timezone) }));
    if (!r.success) return fail(`${where}${r.error.issues[0]?.message ?? "check the time and seats."}`, "schedule");
    schedules.push(r.data);
  }

  // One number for "how many fit": the trip's cap is its biggest departure.
  const maxGuests = Math.max(...schedules.map((s) => s.capacityPerDeparture));

  // --- the trip -------------------------------------------------------------------------------
  const listing = operatorListingInputSchema.safeParse({
    title: text(form, "title"),
    category: text(form, "category"),
    region: text(form, "region"),
    description: text(form, "description"),
    heroImageUrl: text(form, "heroImageUrl") || undefined,
    priceSignal: text(form, "priceSignal") || undefined,
    maxGuests,
    currency: "AUD",
  });
  if (!listing.success) {
    const issue = listing.error.issues[0];
    return fail(issue?.message ?? "Check the trip details and try again.", String(issue?.path[0] ?? "") || undefined);
  }

  // --- prices ---------------------------------------------------------------------------------
  const rawRates = list(form, "rates");
  if (rawRates.length === 0) return fail("Add a price.", "amount");
  const flagged = rawRates.findIndex((r) => r.isDefault === true);
  const rates: RateInput[] = [];
  for (const [i, r] of rawRates.entries()) {
    const where = rawRates.length > 1 ? `Price ${i + 1}: ` : "";
    const amount = price(r.amount);
    const parsed = rateInputSchema.safeParse({
      label: str(r.label),
      amount,
      perGuest: str(r.per) !== "booking",
      minAge: whole(r.minAge),
      maxAge: whole(r.maxAge),
      seasonStart: str(r.seasonStart) || null,
      seasonEnd: str(r.seasonEnd) || null,
      isDefault: i === Math.max(flagged, 0),
    });
    if (!parsed.success) {
      return fail(`${where}${Number.isNaN(amount) ? "enter the price, like 189." : parsed.error.issues[0]?.message ?? "check the price."}`, "amount");
    }
    const v = parsed.data;
    if (v.minAge !== null && v.maxAge !== null && v.maxAge < v.minAge) return fail(`${where}the age range is upside down.`, "amount");
    if (v.seasonStart && v.seasonEnd && v.seasonEnd < v.seasonStart) return fail(`${where}the season ends before it starts.`, "amount");
    rates.push(v);
  }

  // --- closed dates ---------------------------------------------------------------------------
  const closedDates: NewTripValues["closedDates"] = [];
  for (const [i, c] of list(form, "closed").entries()) {
    const where = `Closed dates ${i + 1}: `;
    const startDate = str(c.startDate);
    const endDate = str(c.endDate) || startDate;
    if (!DATE.test(startDate)) return fail(`${where}pick the first closed day.`, "closed");
    if (!DATE.test(endDate) || endDate < startDate) return fail(`${where}the last closed day is before the first.`, "closed");
    closedDates.push({ startDate, endDate, reason: str(c.reason).slice(0, 120) || null });
  }

  // --- photos ---------------------------------------------------------------------------------
  const gallery = [...new Set(list(form, "gallery").map((g) => str(g.url)).filter(Boolean))];
  if (gallery.length > MAX_GALLERY_PHOTOS) return fail(`A trip can have up to ${MAX_GALLERY_PHOTOS} gallery photos.`, "gallery");

  // --- on the day -----------------------------------------------------------------------------
  const meetingPoint = text(form, "meetingPoint");
  if (!meetingPoint) return fail("Say where guests meet you, like “Marina berth 12”.", "meetingPoint");
  if (meetingPoint.length > MEETING_POINT_MAX) return fail(`The meeting point is too long (${MEETING_POINT_MAX} characters at most).`, "meetingPoint");

  const hours = whole(text(form, "hours"));
  const minutes = whole(text(form, "minutes"));
  const durationMinutes = hours === null && minutes === null ? null : (hours ?? 0) * 60 + (minutes ?? 0);
  if (durationMinutes !== null && (!Number.isInteger(durationMinutes) || durationMinutes < 15 || durationMinutes > 60 * 24 * 21)) {
    return fail("Give the trip length in hours and minutes, at least 15 minutes.", "durationMinutes");
  }

  return {
    ok: true,
    values: {
      listing: listing.data,
      schedules,
      rates,
      closedDates,
      gallery,
      busyCalendarId: text(form, "busyCalendarId") || null,
      meetingPoint,
      durationMinutes,
      confirmationNote: text(form, "confirmationNote").slice(0, 1200) || null,
      publish: text(form, "intent") === "publish",
    },
  };
}
