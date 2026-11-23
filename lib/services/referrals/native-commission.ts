import { prisma } from "@/lib/db/prisma";
import { PARTNER_COMMISSION_PCT } from "@/lib/constants/economics";
import { resolveReferralAttribution } from "@/lib/services/referrals/attribution";
import { findReferralAccountId, partnerCommissionLedgerKind } from "@/lib/services/referrals/commission-ledger";

// Kept apart from commission-ledger.ts on purpose: attribution.ts reads cookies (next/headers), and
// commission-ledger.ts is reachable from a client component, where that import breaks the build.

/** The partner's share of one online booking: 5% of what the traveller paid, out of Bluepass's own fee. */
export function partnerCommissionCents(totalCents: number) {
  return Math.round(totalCents * PARTNER_COMMISSION_PCT);
}

type NativeBookingForCommission = {
  id: string;
  reference: string;
  referralCode: string | null;
  totalCents: number;
  currency: string;
};

/**
 * A booking made on Bluepass's own checkout (`ListingBooking`) that arrived through a referral link
 * owes the partner their share once it is PAID. Until now only the inquiry flow wrote a partner
 * line, so a traveller who booked and paid on bluepass.co earned the partner nothing.
 *
 * The code is re-resolved here rather than trusted from the booking: a partner who is not approved
 * (or an unknown code) resolves to no partner and earns nothing. Safe to call twice for the same
 * booking: a Stripe webhook retry finds the line already there and changes nothing.
 *
 * shortcut: the booking is found through metadata.listingBookingId (no column, no migration), fine
 * while the table is small; add an indexed listingBookingId column when it grows.
 */
export async function recordNativeBookingPartnerCommission(booking: NativeBookingForCommission) {
  if (!booking.referralCode) return;
  const { attribution } = await resolveReferralAttribution(booking.referralCode);
  if (!attribution.referralPartnerId) return;

  const where = { kind: partnerCommissionLedgerKind(), metadata: { path: ["listingBookingId"], equals: booking.id } };
  if (await prisma.commissionLedgerEntry.findFirst({ where, select: { id: true } })) return;

  await prisma.commissionLedgerEntry.create({
    data: {
      accountId: await findReferralAccountId(attribution.referralPartnerId, attribution.role),
      referralPartnerId: attribution.referralPartnerId,
      role: attribution.role === "PARTNER" ? "PARTNER" : undefined,
      kind: partnerCommissionLedgerKind(),
      amountCents: partnerCommissionCents(booking.totalCents),
      currency: booking.currency,
      status: "PENDING",
      metadata: {
        source: "native_booking",
        listingBookingId: booking.id,
        reference: booking.reference,
        referralCode: attribution.code,
        referralLinkId: attribution.referralLinkId,
        referralRole: attribution.role,
      },
    },
  });
}

/** The booking was refunded, so the partner did not earn on it. Only a line not yet paid out can be taken back. */
export async function voidNativeBookingPartnerCommission(bookingId: string) {
  await prisma.commissionLedgerEntry.deleteMany({
    where: { kind: partnerCommissionLedgerKind(), status: "PENDING", metadata: { path: ["listingBookingId"], equals: bookingId } },
  });
}

/**
 * Commission on bookings whose trip has not happened yet (or was refunded). It is already in the
 * partner's total, but not yet theirs to withdraw: a trip can still be cancelled and refunded, and
 * a payout made before that cannot be taken back. A line counts as earned once its booking is
 * confirmed, still paid, and departed before `earnedBefore`. Returns the held cents per currency.
 */
export async function heldNativeCommissionCents(referralPartnerId: string, earnedBefore: Date) {
  const lines = await prisma.commissionLedgerEntry.findMany({
    where: { referralPartnerId, kind: partnerCommissionLedgerKind(), metadata: { path: ["source"], equals: "native_booking" } },
    select: { amountCents: true, currency: true, metadata: true },
  });
  const bookingId = (metadata: unknown) => (metadata as { listingBookingId?: string } | null)?.listingBookingId;
  const ids = lines.map((line) => bookingId(line.metadata)).filter((id): id is string => Boolean(id));
  const earned = new Set(
    (await prisma.listingBooking.findMany({
      where: { id: { in: ids }, status: "CONFIRMED", paymentStatus: "PAID", departsAt: { lt: earnedBefore } },
      select: { id: true },
    })).map((booking) => booking.id),
  );

  const held: Record<string, number> = {};
  for (const line of lines) {
    const id = bookingId(line.metadata);
    if (id && earned.has(id)) continue;
    held[line.currency] = (held[line.currency] ?? 0) + line.amountCents;
  }
  return held;
}
