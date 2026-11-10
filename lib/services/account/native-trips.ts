import { prisma } from "@/lib/db/prisma";
import { formatMoneyFromCents } from "@/lib/services/admin/payouts";
import type { TravellerTrip } from "./traveller-bookings";

/**
 * Bookings made on Bluepass's own booking pages (`ListingBooking`), which live in this app's
 * database rather than in Kai. `/account` used to read Kai only, so a traveller who had really
 * paid on bluepass.co saw "No trips yet".
 *
 * Matched on the account's email, case-insensitively, because a booking carries no account id.
 * That is only safe for a verified address: anyone can register with someone else's email, so an
 * unverified account must see none of the bookings made under it. The session already refuses
 * unverified accounts, but this reads the flag itself rather than lean on that.
 */
export type NativeTrips = {
  trips: TravellerTrip[];
  /** Raw, so it can be added to Kai's per-currency totals before anything is formatted. */
  conservation: { currency: string; amountCents: number }[];
};

export const NO_NATIVE_TRIPS: NativeTrips = { trips: [], conservation: [] };

type NativeBookingRow = {
  id: string;
  reference: string;
  status: string;
  paymentStatus: string;
  departsAt: Date;
  timezone: string;
  guests: number;
  totalCents: number;
  currency: string;
  conservationCents: number;
  guestToken: string | null;
  cancelledAt: Date | null;
  createdAt: Date;
  listing: { title: string; operatorProfile: { companyName: string | null } };
};

/** The traveller's own local time at the departure, in the operator's zone, as printed on the confirmation. */
function departure(date: Date, timezone: string) {
  try {
    return new Intl.DateTimeFormat("en-AU", { dateStyle: "full", timeStyle: "short", timeZone: timezone }).format(date);
  } catch {
    return date.toISOString();
  }
}

/** Pure, so the mapping is testable without a database. */
export function nativeTripsFrom(rows: NativeBookingRow[]): NativeTrips {
  const totals = new Map<string, number>();
  for (const row of rows) {
    // Only money Bluepass actually took online carries the 5%; the rest was never ours to count.
    if (row.paymentStatus === "PAID" && row.status !== "CANCELLED" && row.conservationCents > 0) {
      totals.set(row.currency, (totals.get(row.currency) ?? 0) + row.conservationCents);
    }
  }

  return {
    trips: rows.map((row) => ({
      id: row.id,
      kind: "native-booking",
      title: row.listing.title,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      dateText: departure(row.departsAt, row.timezone),
      guests: row.guests,
      operator: row.listing.operatorProfile.companyName,
      tenantSlug: null,
      amount: formatMoneyFromCents(row.totalCents, row.currency),
      reference: row.reference,
      settledAt: null,
      cancelledAt: row.cancelledAt?.toISOString() ?? null,
      href: row.guestToken ? `/trip/${row.guestToken}` : undefined,
    })),
    conservation: [...totals].map(([currency, amountCents]) => ({ currency, amountCents })),
  };
}

export async function loadNativeTrips(accountId: string): Promise<NativeTrips> {
  const account = await prisma.bluePassAccount.findUnique({
    where: { id: accountId },
    select: { email: true, emailVerifiedAt: true },
  });
  if (!account?.emailVerifiedAt) return NO_NATIVE_TRIPS;

  const rows = await prisma.listingBooking.findMany({
    where: {
      leadEmail: { equals: account.email, mode: "insensitive" },
      // Abandoned checkouts (unpaid, expired) are not trips the traveller made.
      paymentStatus: { not: "UNPAID" },
      status: { in: ["CONFIRMED", "REQUESTED", "CANCELLED"] },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true, reference: true, status: true, paymentStatus: true, departsAt: true, timezone: true,
      guests: true, totalCents: true, currency: true, conservationCents: true, guestToken: true,
      cancelledAt: true, createdAt: true,
      listing: { select: { title: true, operatorProfile: { select: { companyName: true } } } },
    },
  });

  return nativeTripsFrom(rows);
}
