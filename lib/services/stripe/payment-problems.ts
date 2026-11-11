import type { Prisma } from "@prisma/client";
import type Stripe from "stripe";
import { prisma } from "@/lib/db/prisma";
import { notifyTeam } from "@/lib/services/outreach/notify";

/**
 * Money going wrong after a payment: a dispute (chargeback), a payout to an operator's bank that
 * failed, a transfer Stripe reversed. Each is written to the booking's history and the team is
 * emailed, because nothing else in the app would ever show it.
 *
 * Replaying an event is safe: a booking records each Stripe event id once, and only the first
 * delivery sends the alert. A failed email never fails the webhook (see notifyTeam).
 *
 * Subscribe the endpoints to exactly these types: charge.dispute.created, charge.dispute.closed,
 * transfer.reversed and payout.failed (the Connect endpoint needs payout.failed on connected accounts).
 *
 * shortcut: a booking with two separate disputes is treated as one (a win on either re-opens its
 * payout); revisit if Bluepass ever sees a second dispute on the same booking.
 */
export const PROBLEM_EVENTS = ["charge.dispute.created", "charge.dispute.closed", "transfer.reversed", "payout.failed"] as const;

const idOf = (v: string | { id: string } | null | undefined) => (typeof v === "string" ? v : v?.id ?? null);
const money = (cents: number, currency: string) => `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;
const dashboard = (event: Stripe.Event, path: string) => `https://dashboard.stripe.com/${event.livemode ? "" : "test/"}${path}`;

/** False when this Stripe event was already recorded on the booking (a replay). */
async function record(bookingId: string, type: string, event: Stripe.Event, message: string, payload: Record<string, unknown>) {
  const seen = await prisma.listingBookingEvent.findFirst({
    where: { bookingId, type, payload: { path: ["stripeEventId"], equals: event.id } },
    select: { id: true },
  });
  if (seen) return false;
  await prisma.listingBookingEvent.create({
    data: { bookingId, type, actor: "stripe", message, payload: { stripeEventId: event.id, ...payload } as Prisma.InputJsonValue },
  });
  return true;
}

async function dispute(event: Stripe.Event) {
  const d = event.data.object as Stripe.Dispute;
  const chargeId = idOf(d.charge);
  const intentId = idOf(d.payment_intent);
  const booking = await prisma.listingBooking.findFirst({
    where: { OR: [...(intentId ? [{ stripePaymentIntentId: intentId }] : []), ...(chargeId ? [{ stripeChargeId: chargeId }] : [])] },
    select: { id: true, reference: true, settledAt: true, operatorProfile: { select: { companyName: true } } },
  });
  const amount = money(d.amount, d.currency);
  const link = dashboard(event, `disputes/${d.id}`);
  const opened = event.type === "charge.dispute.created";
  const outcome = d.status === "won" ? "won" : "lost";

  if (!booking) {
    await notifyTeam({
      subject: `[Bluepass money] Dispute ${opened ? "opened" : `closed (${outcome})`}: ${amount}, no website booking matched`,
      text: `A dispute of ${amount} (${d.reason}) was ${opened ? "opened" : `closed as ${outcome}`}, but no website booking matches payment ${intentId ?? chargeId}. It may belong to a Kai booking.\n\n${link}`,
    });
    return;
  }

  const type = opened ? "dispute_opened" : d.status === "won" ? "dispute_won" : "dispute_lost";
  const due = d.evidence_details?.due_by ? new Date(d.evidence_details.due_by * 1000).toUTCString() : "see Stripe";
  const message = opened
    ? `Dispute opened for ${amount}: ${d.reason}. Evidence due ${due}.`
    : `Dispute closed as ${outcome} (${amount}).`;
  if (!(await record(booking.id, type, event, message, { disputeId: d.id, amountCents: d.amount, currency: d.currency, reason: d.reason, status: d.status }))) return;

  const who = booking.operatorProfile.companyName ?? "the operator";
  const consequence = booking.settledAt
    ? `${who} has ALREADY been paid for this booking, so a loss falls on Bluepass until the transfer is reversed in Stripe.`
    : opened
      ? `The payout to ${who} is paused for this booking until the dispute is won.`
      : outcome === "won"
        ? `The payout to ${who} is released again.`
        : `The payout to ${who} stays blocked; the money is not coming back.`;
  await notifyTeam({
    subject: `[Bluepass money] Dispute ${opened ? "opened" : `closed (${outcome})`} on ${booking.reference}: ${amount}`,
    text: `${message}\n\n${consequence}\n\n${link}`,
  });
}

async function transferReversed(event: Stripe.Event) {
  const t = event.data.object as Stripe.Transfer;
  const amount = money(t.amount, t.currency);
  const booking = await prisma.listingBooking.findFirst({ where: { stripeTransferId: t.id }, select: { id: true, reference: true } });
  const link = dashboard(event, `transfers/${t.id}`);
  if (booking && !(await record(booking.id, "transfer_reversed", event, `The payout transfer of ${amount} was reversed.`, { transferId: t.id, amountCents: t.amount }))) return;
  await notifyTeam({
    subject: `[Bluepass money] Operator transfer reversed${booking ? ` on ${booking.reference}` : ""}: ${amount}`,
    text: `Stripe reversed a transfer of ${amount} to a connected account${booking ? ` (booking ${booking.reference})` : ", not matched to a website booking"}.\n\n${link}`,
  });
}

async function payoutFailed(event: Stripe.Event) {
  const p = event.data.object as Stripe.Payout;
  const amount = money(p.amount, p.currency);
  const reason = p.failure_message || p.failure_code || "no reason given";
  const profile = event.account
    ? await prisma.operatorProfile.findUnique({ where: { stripeConnectAccountId: event.account }, select: { companyName: true } })
    : null;
  const whose = event.account ? `${profile?.companyName ?? `connected account ${event.account}`}'s` : "Bluepass's own";
  await notifyTeam({
    subject: `[Bluepass money] ${whose} bank payout failed: ${amount}`,
    text: `A payout of ${amount} to ${whose} bank account failed: ${reason}.\n\n${dashboard(event, `payouts/${p.id}`)}`,
  });
}

/** Returns false for any event type this does not handle. */
export async function handlePaymentProblem(event: Stripe.Event) {
  if (event.type === "charge.dispute.created" || event.type === "charge.dispute.closed") await dispute(event);
  else if (event.type === "transfer.reversed") await transferReversed(event);
  else if (event.type === "payout.failed") await payoutFailed(event);
  else return false;
  return true;
}
