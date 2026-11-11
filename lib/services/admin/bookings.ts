import { prisma } from "@/lib/db/prisma";
import { SETTLE_AFTER_HOURS } from "@/lib/services/rails/settlement";
import type { PillTone } from "@/components/admin/StatusPill";

/**
 * The admin's view of money on website bookings: what was paid, what was refunded, and where the
 * operator's payout stands. Read-only apart from the cancel action in app/admin/bookings/actions.ts.
 */

export type DisputeState = "none" | "open" | "won" | "lost";

export type PayoutInput = {
  status: string;
  paymentStatus: string;
  operatorNetCents: number;
  settledAt: Date | null;
  departsAt: Date;
  dispute: DisputeState;
  operator: { payoutMethod: string | null; stripeConnectAccountId: string | null; stripePayoutsEnabled: boolean };
};

export type PayoutState = { label: string; tone: PillTone };

/** What the operator's payout is waiting for, in one line. */
export function payoutState(b: PayoutInput, opts: { now?: Date; settlementOn: boolean }): PayoutState {
  const now = opts.now ?? new Date();
  if (b.paymentStatus === "REFUNDED") return { label: "Refunded", tone: "muted" };
  if (b.dispute === "open") return { label: "Dispute open, payout paused", tone: "bad" };
  if (b.dispute === "lost") return { label: "Dispute lost, payout blocked", tone: "bad" };
  if (b.paymentStatus !== "PAID" && b.paymentStatus !== "PARTIALLY_REFUNDED") return { label: "No online payment", tone: "muted" };
  if (b.operatorNetCents <= 0) return { label: "Nothing owed", tone: "muted" };
  if (b.settledAt) return { label: "Paid out", tone: "good" };
  if (b.status !== "CONFIRMED") return { label: "Waiting for the operator to confirm", tone: "warn" };

  const dueAt = new Date(b.departsAt.getTime() + SETTLE_AFTER_HOURS * 3_600_000);
  if (dueAt > now) return { label: `Held until ${dueAt.toISOString().slice(0, 10)}`, tone: "muted" };

  const op = b.operator;
  if (op.payoutMethod !== "STRIPE_CONNECT" || !op.stripeConnectAccountId || !op.stripePayoutsEnabled) {
    return { label: "Due, operator has no payout account", tone: "warn" };
  }
  return opts.settlementOn ? { label: "Due at the next settlement run", tone: "warn" } : { label: "Due, but settlement is switched off", tone: "bad" };
}

/** Stripe reports each dispute stage as an event on the booking (see lib/services/stripe/payment-problems.ts). */
export function disputeState(eventTypes: string[]): DisputeState {
  if (!eventTypes.includes("dispute_opened")) return "none";
  if (eventTypes.includes("dispute_won")) return "won";
  return eventTypes.includes("dispute_lost") ? "lost" : "open";
}

export type BookingView = "recent" | "payout" | "disputes";

export async function loadAdminBookings(input: { view: BookingView; q?: string; now?: Date }) {
  const q = input.q?.trim();
  const search = q
    ? { OR: [{ reference: { contains: q, mode: "insensitive" as const } }, { leadEmail: { contains: q, mode: "insensitive" as const } }, { leadName: { contains: q, mode: "insensitive" as const } }] }
    : {};
  const where =
    input.view === "payout"
      ? { status: "CONFIRMED" as const, paymentStatus: "PAID" as const, settledAt: null, operatorNetCents: { gt: 0 }, ...search }
      : input.view === "disputes"
        ? { events: { some: { type: "dispute_opened" } }, ...search }
        : search;

  const rows = await prisma.listingBooking.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true, reference: true, status: true, paymentStatus: true, channel: true, source: true,
      departsAt: true, timezone: true, guests: true, totalCents: true, refundedCents: true, operatorNetCents: true,
      conservationCents: true, currency: true, leadName: true, leadEmail: true, settledAt: true, createdAt: true,
      stripePaymentIntentId: true, cancelReason: true,
      listing: { select: { title: true } },
      operatorProfile: { select: { companyName: true, payoutMethod: true, stripeConnectAccountId: true, stripePayoutsEnabled: true } },
      events: { orderBy: { createdAt: "desc" }, take: 12, select: { type: true, actor: true, message: true, createdAt: true } },
    },
  });

  const settlementOn = process.env.NATIVE_SETTLEMENT_ENABLED === "true";
  return rows.map((b) => {
    const dispute = disputeState(b.events.map((e) => e.type));
    return { ...b, dispute, payout: payoutState({ ...b, dispute, operator: b.operatorProfile }, { now: input.now, settlementOn }) };
  });
}

/** Money Bluepass is holding for operators and has not paid yet, per currency, plus open disputes. */
export async function bookingMoneySummary() {
  const [owed, disputes] = await Promise.all([
    prisma.listingBooking.groupBy({
      by: ["currency"],
      where: { status: "CONFIRMED", paymentStatus: "PAID", settledAt: null, operatorNetCents: { gt: 0 } },
      _sum: { operatorNetCents: true },
      _count: true,
    }),
    prisma.listingBooking.count({ where: { events: { some: { type: "dispute_opened" }, none: { type: { in: ["dispute_won", "dispute_lost"] } } } } }),
  ]);
  return { owed, openDisputes: disputes };
}
