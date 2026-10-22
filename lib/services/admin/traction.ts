import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

/**
 * The numbers an investor or a new teammate asks for first, counted from this app's own database.
 *
 * Nothing here is estimated, and nothing made for testing is counted: a figure on this page that is
 * partly the team's own dummy accounts is worse than a small honest one. Accounts on the placeholder
 * domain (the dummy operator and partner, and the stand-ins prepared pages hold until an operator
 * claims them) and businesses named "(test)" are left out unless the page is asked to include them.
 *
 * Money is never added across currencies: AUD and USD are different numbers.
 */

const PLACEHOLDER_DOMAIN = "@ops.bluepass.co";
/** A booking that is real demand: held seats that lapsed, abandoned checkouts and cancellations are not. */
const COUNTED_STATUSES = ["CONFIRMED", "REQUESTED"] as const;
const WEEKS = 8;

export function realOperatorWhere(includeTest: boolean): Prisma.OperatorProfileWhereInput {
  if (includeTest) return {};
  return {
    account: { email: { not: { endsWith: PLACEHOLDER_DOMAIN } } },
    OR: [{ companyName: null }, { NOT: { companyName: { contains: "(test)", mode: "insensitive" } } }],
  };
}

export function realAccountWhere(includeTest: boolean): Prisma.BluePassAccountWhereInput {
  if (includeTest) return {};
  return { AND: [{ email: { not: { endsWith: PLACEHOLDER_DOMAIN } } }, { email: { not: { endsWith: ".test" } } }, { email: { not: { endsWith: "@example.com" } } }] };
}

/** Monday 00:00 UTC of the week a moment falls in. */
export function weekStart(date: Date): Date {
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const sinceMonday = (day.getUTCDay() + 6) % 7;
  day.setUTCDate(day.getUTCDate() - sinceMonday);
  return day;
}

/** One count per week for the last `weeks` weeks, oldest first, empty weeks included so a gap shows as a gap. */
export function weeklyBuckets(dates: Date[], now: Date, weeks: number): { weekStart: string; count: number }[] {
  const thisWeek = weekStart(now).getTime();
  const buckets = Array.from({ length: weeks }, (_, index) => {
    const start = new Date(thisWeek - (weeks - 1 - index) * 7 * 86_400_000);
    return { weekStart: start.toISOString().slice(0, 10), count: 0 };
  });
  const byStart = new Map(buckets.map((bucket) => [bucket.weekStart, bucket]));
  for (const date of dates) {
    const bucket = byStart.get(weekStart(date).toISOString().slice(0, 10));
    if (bucket) bucket.count += 1;
  }
  return buckets;
}

export type TractionMoney = {
  currency: string;
  /** Booked through Bluepass (online or Kai). */
  throughBluepassCents: number;
  /** Entered by operators themselves, for bookings Bluepass did not handle. */
  enteredByOperatorsCents: number;
  /** The fixed 5% set aside for the reef. */
  conservationCents: number;
};

export type Traction = {
  includeTest: boolean;
  operators: { live: number; waitingForApproval: number };
  trips: { live: number; native: number; rezdy: number; fareHarbor: number };
  bookings: { count: number; guests: number; throughBluepass: number; enteredByOperators: number; money: TractionMoney[]; weekly: { weekStart: string; count: number }[] };
  pipeline: { leads: number; claimed: number; live: number; pages: number; pagesApproved: number };
  demand: { waitlistTotal: number; waitlistOperators: number; waitlistPartners: number; waitlistTravellers: number; travellerAccounts: number };
};

const CLAIMED_STATUSES = ["CLAIM_SUBMITTED", "APPROVED", "LIVE"] as const;

export async function loadTraction(options: { includeTest?: boolean; now?: Date } = {}): Promise<Traction> {
  const includeTest = options.includeTest ?? false;
  const now = options.now ?? new Date();
  const operatorWhere = realOperatorWhere(includeTest);
  const countedBookings: Prisma.ListingBookingWhereInput = { status: { in: [...COUNTED_STATUSES] }, operatorProfile: operatorWhere };

  const [live, waiting, listings, bookingGroups, recent, leads, claimed, liveLeads, pages, pagesApproved, waitlist, travellerAccounts] = await Promise.all([
    prisma.operatorProfile.count({ where: { ...operatorWhere, status: "LIVE" } }),
    prisma.operatorProfile.count({ where: { ...operatorWhere, status: "PENDING_REVIEW" } }),
    prisma.operatorListing.groupBy({ by: ["channel"], where: { status: "LIVE", operatorProfile: operatorWhere }, _count: true }),
    prisma.listingBooking.groupBy({ by: ["currency", "source"], where: countedBookings, _count: true, _sum: { totalCents: true, conservationCents: true, guests: true } }),
    prisma.listingBooking.findMany({ where: { ...countedBookings, createdAt: { gte: new Date(weekStart(now).getTime() - (WEEKS - 1) * 7 * 86_400_000) } }, select: { createdAt: true } }),
    prisma.operatorLead.count(),
    prisma.operatorLead.count({ where: { status: { in: [...CLAIMED_STATUSES] } } }),
    prisma.operatorLead.count({ where: { status: "LIVE" } }),
    prisma.preparedOperatorPage.count(),
    prisma.preparedOperatorPage.count({ where: { qcStatus: "approved" } }),
    prisma.waitlistSignup.groupBy({ by: ["role"], _count: true }),
    prisma.bluePassAccount.count({ where: { ...realAccountWhere(includeTest), roles: { has: "TRAVELLER" } } }),
  ]);

  const channelCount = (channel: string) => listings.find((row) => row.channel === channel)?._count ?? 0;
  const money = new Map<string, TractionMoney>();
  let count = 0;
  let guests = 0;
  let throughBluepass = 0;
  let enteredByOperators = 0;
  for (const group of bookingGroups) {
    const row = money.get(group.currency) ?? { currency: group.currency, throughBluepassCents: 0, enteredByOperatorsCents: 0, conservationCents: 0 };
    const total = group._sum.totalCents ?? 0;
    if (group.source === "OPERATOR") {
      row.enteredByOperatorsCents += total;
      enteredByOperators += group._count;
    } else {
      row.throughBluepassCents += total;
      throughBluepass += group._count;
    }
    row.conservationCents += group._sum.conservationCents ?? 0;
    money.set(group.currency, row);
    count += group._count;
    guests += group._sum.guests ?? 0;
  }
  const waitlistBy = (role: string) => waitlist.find((row) => row.role === role)?._count ?? 0;

  return {
    includeTest,
    operators: { live, waitingForApproval: waiting },
    trips: { live: listings.reduce((sum, row) => sum + row._count, 0), native: channelCount("NATIVE"), rezdy: channelCount("REZDY"), fareHarbor: channelCount("FAREHARBOR") },
    bookings: {
      count,
      guests,
      throughBluepass,
      enteredByOperators,
      money: [...money.values()].sort((a, b) => a.currency.localeCompare(b.currency)),
      weekly: weeklyBuckets(recent.map((row) => row.createdAt), now, WEEKS),
    },
    pipeline: { leads, claimed, live: liveLeads, pages, pagesApproved },
    demand: {
      waitlistTotal: waitlist.reduce((sum, row) => sum + row._count, 0),
      waitlistOperators: waitlistBy("OPERATOR"),
      waitlistPartners: waitlistBy("PARTNER"),
      waitlistTravellers: waitlistBy("TRAVELLER"),
      travellerAccounts,
    },
  };
}
