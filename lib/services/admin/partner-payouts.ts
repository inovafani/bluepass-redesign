import { prisma } from "@/lib/db/prisma";
import { decryptCredentials } from "@/lib/services/booking/adapters/credentials";

export type PartnerPayoutRequestRow = {
  id: string;
  referralPartnerId: string;
  partnerName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  amountCents: number;
  currency: string;
  createdAt: Date;
};

/**
 * Every payout request still awaiting a decision, with just enough partner contact info for an
 * admin to know who they're paying. `partnerProfiles`/`account` are read via ReferralPartner's own
 * relations rather than a second lookup keyed some other way, since a payout request only ever
 * exists for a partner that already went through partner approval.
 */
export async function listPendingPartnerPayoutRequests(): Promise<PartnerPayoutRequestRow[]> {
  const requests = await prisma.partnerPayoutRequest.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: {
      referralPartner: {
        select: {
          name: true,
          email: true,
          phone: true,
          partnerProfiles: { select: { account: { select: { email: true, phone: true } } }, take: 1 },
        },
      },
    },
  });

  return requests.map((request) => {
    const account = request.referralPartner.partnerProfiles[0]?.account;

    return {
      id: request.id,
      referralPartnerId: request.referralPartnerId,
      partnerName: request.referralPartner.name,
      contactEmail: request.referralPartner.email ?? account?.email ?? null,
      contactPhone: request.referralPartner.phone ?? account?.phone ?? null,
      amountCents: request.amountCents,
      currency: request.currency,
      createdAt: request.createdAt,
    };
  });
}

export type RevealPayoutDetailsResult = { ok: true; bankDetails: string } | { ok: false; error: string };

/**
 * Decrypts one partner's bank details for one admin, right now, to complete one specific payout -
 * not a general-purpose "decrypt anything" endpoint. Unlike OperatorProfile.encryptedPayoutDetails
 * (write-only everywhere in this codebase today - presumably paid via an out-of-band script), this
 * is a deliberate, narrow exception: a payout request an admin can't actually read the destination
 * for isn't a usable feature. Recorded on the profile's own notes for the same reason every other
 * write to this table already is - an audit trail of who saw a partner's bank details, and when.
 */
export async function revealPartnerPayoutDetails(
  referralPartnerId: string,
  revealedByEmail: string,
): Promise<RevealPayoutDetailsResult> {
  const profile = await prisma.partnerProfile.findFirst({
    where: { referralPartnerId },
    select: { id: true, notes: true, encryptedPayoutDetails: true },
  });

  if (!profile?.encryptedPayoutDetails) {
    return { ok: false, error: "No payout details are on file for this partner." };
  }

  let bankDetails: string;

  try {
    const decrypted = decryptCredentials<{ bankDetails?: string }>(profile.encryptedPayoutDetails);
    bankDetails = decrypted.bankDetails ?? "";
  } catch {
    return { ok: false, error: "Those payout details could not be read. Contact the partner to re-enter them." };
  }

  const recordedAt = new Date().toISOString().slice(0, 10);
  await prisma.partnerProfile.update({
    where: { id: profile.id },
    data: { notes: appendNote(profile.notes, `Payout details revealed by ${revealedByEmail} on ${recordedAt}.`) },
  });

  return { ok: true, bankDetails };
}

export type MarkPartnerPayoutPaidResult = { ok: true } | { ok: false; error: string };

export async function markPartnerPayoutRequestPaid(input: {
  requestId: string;
  reference: string;
  paidByEmail: string;
}): Promise<MarkPartnerPayoutPaidResult> {
  const request = await prisma.partnerPayoutRequest.findUnique({ where: { id: input.requestId } });

  if (!request) {
    return { ok: false, error: "That payout request no longer exists." };
  }

  if (request.status !== "PENDING") {
    return { ok: false, error: "That payout request has already been decided." };
  }

  await prisma.partnerPayoutRequest.update({
    where: { id: input.requestId },
    data: {
      status: "PAID",
      paidAt: new Date(),
      paidBy: input.paidByEmail,
      paidReference: input.reference.trim() || null,
    },
  });

  return { ok: true };
}

export type DeclinePartnerPayoutResult = { ok: true } | { ok: false; error: string };

export async function declinePartnerPayoutRequest(input: {
  requestId: string;
  reason: string;
  declinedByEmail: string;
}): Promise<DeclinePartnerPayoutResult> {
  const request = await prisma.partnerPayoutRequest.findUnique({ where: { id: input.requestId } });

  if (!request) {
    return { ok: false, error: "That payout request no longer exists." };
  }

  if (request.status !== "PENDING") {
    return { ok: false, error: "That payout request has already been decided." };
  }

  await prisma.partnerPayoutRequest.update({
    where: { id: input.requestId },
    data: {
      status: "DECLINED",
      declinedAt: new Date(),
      declinedBy: input.declinedByEmail,
      declineReason: input.reason.trim() || null,
    },
  });

  return { ok: true };
}

function appendNote(existing: string | null, line: string) {
  return existing?.trim() ? `${existing.trim()}\n${line}` : line;
}
