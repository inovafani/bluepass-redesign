import {
  formatMoneyFromCents,
  section,
  type SectionResult,
} from "@/lib/services/admin/payouts";
import {
  listKaiCoreTravellerBookings,
  type KaiCoreTravellerBookings,
} from "@/lib/services/kai-core/client";

/**
 * One traveller's trips, with the two regions flattened into the single list they actually think
 * in.
 *
 * A traveller has no idea that an Australian booking and an Indonesian inquiry are different
 * records in different systems, and they should not have to: both are "a trip I asked Bluepass
 * about". The `kind` survives the merge only because the two carry genuinely different information
 * — an AU attempt has a price and a booking reference, an ID inquiry has neither and is a
 * conversation still in progress — and hiding that difference would be its own kind of lie.
 */
export type TravellerTrip = {
  id: string;
  kind: "au-booking" | "indonesia-inquiry";
  /** What the traveller would call it: the product they picked, or the yacht, or the destination. */
  title: string;
  status: string;
  createdAt: string;
  /** Free text as the operator wrote it — a real date range, not a parsed one. */
  dateText: string | null;
  guests: number | null;
  /** The business behind it: the operator's own name where known, else the tenant's. */
  operator: string | null;
  tenantSlug: string | null;
  /** Formatted, never raw cents. Null for an inquiry, which has no price yet. */
  amount: string | null;
  reference: string | null;
  settledAt: string | null;
  cancelledAt: string | null;
};

export type TravellerConservationSummary = { currency: string; amount: string }[];

/** Formats Kai's raw per-currency cents into display strings, in the order Kai already sorted them. */
export function formatTravellerConservation(
  data: Pick<KaiCoreTravellerBookings, "conservationByCurrency">,
): TravellerConservationSummary {
  return data.conservationByCurrency.map((row) => ({
    currency: row.currency,
    amount: formatMoneyFromCents(row.amountCents, row.currency),
  }));
}

/**
 * Merges and sorts. Pure, so the ordering and the field-mapping are testable without a network.
 *
 * Newest first by `createdAt`, which is the only field both sides share and the only ordering a
 * traveller would expect. Kai already sorts each list; interleaving them is what this adds.
 */
export function mergeTravellerTrips(
  data: Pick<KaiCoreTravellerBookings, "auBookings" | "indonesiaInquiries">,
): TravellerTrip[] {
  const au: TravellerTrip[] = data.auBookings.map((booking) => ({
    id: booking.id,
    kind: "au-booking",
    title: booking.productTitle,
    status: booking.status,
    createdAt: booking.createdAt,
    dateText: booking.dateText || null,
    guests: booking.guests,
    operator: booking.tenant?.name ?? null,
    tenantSlug: booking.tenant?.slug ?? null,
    amount: formatMoneyFromCents(booking.grossAmountCents, booking.currency),
    reference: booking.externalBookingId || null,
    settledAt: booking.settledAt,
    cancelledAt: booking.cancelledAt,
  }));

  const indonesia: TravellerTrip[] = data.indonesiaInquiries.map((inquiry) => ({
    id: inquiry.id,
    kind: "indonesia-inquiry",
    /* An inquiry may never have got as far as naming a yacht, so the destination is the fallback
       before any invented title — "Trip enquiry" is the honest last resort, not a placeholder
       standing in for a real name we simply failed to read. */
    title: inquiry.selectedYachtName ?? inquiry.destination ?? "Trip enquiry",
    status: inquiry.status,
    createdAt: inquiry.createdAt,
    dateText: inquiry.dateWindow,
    guests: inquiry.guests,
    operator: inquiry.operatorName ?? inquiry.tenant?.name ?? null,
    tenantSlug: inquiry.tenant?.slug ?? null,
    amount: null,
    reference: null,
    settledAt: null,
    cancelledAt: null,
  }));

  return [...au, ...indonesia].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export type TravellerTripsAndImpact = {
  trips: TravellerTrip[];
  conservation: TravellerConservationSummary;
};

/**
 * Loads one traveller's trips and their own conservation contribution in the one Kai call, capturing
 * a failure rather than throwing.
 *
 * Same discipline as the admin payouts page, and for the same reason: an unreachable Kai rendered
 * as an empty list would tell a traveller with real, paid bookings that they have none. "We could
 * not load this" and "you have not booked anything" have to stay distinguishable all the way to
 * the screen.
 */
export async function loadTravellerTrips(
  travellerAccountId: string,
): Promise<SectionResult<TravellerTripsAndImpact>> {
  return section(async () => {
    const data = await listKaiCoreTravellerBookings({ travellerAccountId });
    return { trips: mergeTravellerTrips(data), conservation: formatTravellerConservation(data) };
  });
}
