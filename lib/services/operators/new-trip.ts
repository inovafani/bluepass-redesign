import { operatorListingInputSchema, type OperatorListingInput } from "@/lib/services/operators/operator-listing-service";
import { rateInputSchema, scheduleInputSchema, type RateInput, type ScheduleInput } from "@/lib/services/rails/setup";

/**
 * The one form a new trip is made on: what it is, when it runs, what it costs and where guests meet.
 * Read here, apart from the database, so a bad answer is named before anything is created.
 */
export type NewTripValues = {
  listing: OperatorListingInput;
  schedule: ScheduleInput;
  rate: RateInput;
  meetingPoint: string;
  publish: boolean;
};

export type NewTripParse = { ok: true; values: NewTripValues } | { ok: false; message: string; field?: string };

const text = (form: FormData, name: string) => {
  const v = form.get(name);
  return typeof v === "string" ? v.trim() : "";
};

/** Blank is "not given", never zero. */
function whole(form: FormData, name: string): number | null {
  const v = text(form, name);
  if (v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : Number.NaN;
}

/** "A$189", "189.50" and "1,200" all read; anything without digits is NaN so the field gets the error. */
function price(form: FormData, name: string): number {
  const v = text(form, name).replace(/[,\s]/g, "").replace(/^[A-Z$]+/i, "");
  return v === "" ? Number.NaN : Number(v);
}

/** The schedule schema names its fields one way; the form names them another. */
const FORM_FIELD: Record<string, string> = { capacityPerDeparture: "capacity", departureTimes: "time", weekdays: "weekday" };

export const MEETING_POINT_MAX = 200;

export function parseNewTrip(form: FormData): NewTripParse {
  const seats = whole(form, "capacity");

  const listing = operatorListingInputSchema.safeParse({
    title: text(form, "title"),
    category: text(form, "category"),
    region: text(form, "region"),
    description: text(form, "description"),
    heroImageUrl: text(form, "heroImageUrl") || undefined,
    // One number for "how many fit": it caps the listing and is the seats on every departure.
    maxGuests: seats === null ? undefined : seats,
    currency: "AUD",
  });
  if (!listing.success) {
    const issue = listing.error.issues[0];
    return { ok: false, message: issue?.message ?? "Check the trip details and try again.", field: String(issue?.path[0] ?? "") || undefined };
  }

  const schedule = scheduleInputSchema.safeParse({
    weekdays: form.getAll("weekday").map(Number),
    departureTimes: form.getAll("time").map((t) => String(t).trim()).filter(Boolean),
    capacityPerDeparture: seats ?? Number.NaN,
    minGuests: 1,
    cutoffHours: whole(form, "cutoffHours") ?? 24,
    maxAdvanceDays: 365,
    timezone: text(form, "timezone"),
    seasonStart: null,
    seasonEnd: null,
  });
  if (!schedule.success) {
    const issue = schedule.error.issues[0];
    const path = String(issue?.path[0] ?? "");
    return { ok: false, message: issue?.message ?? "Check when the trip runs and try again.", field: FORM_FIELD[path] ?? path };
  }

  const amount = price(form, "amount");
  const rate = rateInputSchema.safeParse({
    label: "Adult",
    amount,
    perGuest: true,
    minAge: null,
    maxAge: null,
    seasonStart: null,
    seasonEnd: null,
    isDefault: true,
  });
  if (!rate.success) {
    return { ok: false, message: Number.isNaN(amount) ? "Enter the price per guest, like 189." : rate.error.issues[0]?.message ?? "Check the price and try again.", field: "amount" };
  }

  const meetingPoint = text(form, "meetingPoint");
  if (!meetingPoint) return { ok: false, message: "Say where guests meet you, like “Marina berth 12”.", field: "meetingPoint" };
  if (meetingPoint.length > MEETING_POINT_MAX) return { ok: false, message: `The meeting point is too long (${MEETING_POINT_MAX} characters at most).`, field: "meetingPoint" };

  return { ok: true, values: { listing: listing.data, schedule: schedule.data, rate: rate.data, meetingPoint, publish: text(form, "intent") === "publish" } };
}
