import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { encryptCredentials } from "@/lib/services/booking/adapters/credentials";
import {
  declinePartnerPayoutRequest,
  listPendingPartnerPayoutRequests,
  markPartnerPayoutRequestPaid,
  revealPartnerPayoutDetails,
} from "./partner-payouts";

const EMAIL_PREFIX = "admin-partner-payouts-test+";

afterAll(async () => {
  const accounts = await prisma.bluePassAccount.findMany({
    where: { email: { startsWith: EMAIL_PREFIX } },
    select: { id: true },
  });
  const partners = await prisma.referralPartner.findMany({
    where: { email: { startsWith: EMAIL_PREFIX } },
    select: { id: true },
  });
  const partnerIds = partners.map((p) => p.id);
  if (partnerIds.length > 0) {
    await prisma.partnerPayoutRequest.deleteMany({ where: { referralPartnerId: { in: partnerIds } } });
  }
  await prisma.bluePassAccount.deleteMany({ where: { id: { in: accounts.map((a) => a.id) } } });
  if (partnerIds.length > 0) {
    await prisma.referralPartner.deleteMany({ where: { id: { in: partnerIds } } });
  }
});

async function partnerWithPayoutDetails(bankDetails: string | null) {
  const email = `${EMAIL_PREFIX}${randomUUID()}@partners.bluepass.co`;
  // BluePassAccount.phone is unique now - every seeded account needs its own.
  const phone = `+61${randomUUID()}`;
  const account = await prisma.bluePassAccount.create({
    data: { email, passwordHash: randomUUID(), emailVerifiedAt: new Date(), roles: ["PARTNER"], phone },
    select: { id: true },
  });
  const partner = await prisma.referralPartner.create({
    data: { role: "PARTNER", name: `Admin Payout Test ${randomUUID()}`, email },
    select: { id: true },
  });
  await prisma.partnerProfile.create({
    data: {
      accountId: account.id,
      referralPartnerId: partner.id,
      status: "APPROVED",
      notes: "Approved 2026-08-01.",
      encryptedPayoutDetails: bankDetails
        ? encryptCredentials({ method: "MANUAL_BANK_TRANSFER", bankDetails, recordedBy: email, recordedAt: new Date().toISOString() })
        : null,
    },
  });

  return { partnerId: partner.id, email, phone };
}

describe("listPendingPartnerPayoutRequests", () => {
  it("lists a pending request with the partner's contact details", async () => {
    const { partnerId, email, phone } = await partnerWithPayoutDetails("Acc 12345");
    await prisma.partnerPayoutRequest.create({
      data: { referralPartnerId: partnerId, requestedByAccountId: "acct_x", amountCents: 5_000, currency: "USD" },
    });

    const rows = await listPendingPartnerPayoutRequests();
    const row = rows.find((r) => r.referralPartnerId === partnerId);

    expect(row).toMatchObject({ contactEmail: email, contactPhone: phone, amountCents: 5_000, currency: "USD" });
  });

  it("does not include a request that's already been decided", async () => {
    const { partnerId } = await partnerWithPayoutDetails("Acc 12345");
    await prisma.partnerPayoutRequest.create({
      data: {
        referralPartnerId: partnerId,
        requestedByAccountId: "acct_x",
        amountCents: 5_000,
        currency: "USD",
        status: "PAID",
        paidAt: new Date(),
      },
    });

    const rows = await listPendingPartnerPayoutRequests();
    expect(rows.find((r) => r.referralPartnerId === partnerId)).toBeUndefined();
  });
});

describe("revealPartnerPayoutDetails", () => {
  it("decrypts the stored bank details and records who revealed them", async () => {
    const { partnerId } = await partnerWithPayoutDetails("Account name: Reef Co\nNo 55556666");

    const result = await revealPartnerPayoutDetails(partnerId, "admin@bluepass.co");

    expect(result).toEqual({ ok: true, bankDetails: "Account name: Reef Co\nNo 55556666" });

    const profile = await prisma.partnerProfile.findFirstOrThrow({ where: { referralPartnerId: partnerId } });
    expect(profile.notes).toContain("Payout details revealed by admin@bluepass.co");
  });

  it("refuses when nothing is on file", async () => {
    const { partnerId } = await partnerWithPayoutDetails(null);

    const result = await revealPartnerPayoutDetails(partnerId, "admin@bluepass.co");

    expect(result).toEqual({ ok: false, error: "No payout details are on file for this partner." });
  });
});

describe("markPartnerPayoutRequestPaid / declinePartnerPayoutRequest", () => {
  it("marks a pending request paid with a reference and the approving admin", async () => {
    const { partnerId } = await partnerWithPayoutDetails("Acc 12345");
    const request = await prisma.partnerPayoutRequest.create({
      data: { referralPartnerId: partnerId, requestedByAccountId: "acct_x", amountCents: 7_000, currency: "USD" },
    });

    const result = await markPartnerPayoutRequestPaid({
      requestId: request.id,
      reference: "TXN-001",
      paidByEmail: "admin@bluepass.co",
    });

    expect(result.ok).toBe(true);
    const after = await prisma.partnerPayoutRequest.findUniqueOrThrow({ where: { id: request.id } });
    expect(after).toMatchObject({ status: "PAID", paidBy: "admin@bluepass.co", paidReference: "TXN-001" });
    expect(after.paidAt).not.toBeNull();
  });

  it("refuses to re-decide a request that's already been paid", async () => {
    const { partnerId } = await partnerWithPayoutDetails("Acc 12345");
    const request = await prisma.partnerPayoutRequest.create({
      data: {
        referralPartnerId: partnerId,
        requestedByAccountId: "acct_x",
        amountCents: 7_000,
        currency: "USD",
        status: "PAID",
        paidAt: new Date(),
      },
    });

    const result = await declinePartnerPayoutRequest({
      requestId: request.id,
      reason: "test",
      declinedByEmail: "admin@bluepass.co",
    });

    expect(result).toEqual({ ok: false, error: "That payout request has already been decided." });
  });

  it("declines a pending request with a reason", async () => {
    const { partnerId } = await partnerWithPayoutDetails("Acc 12345");
    const request = await prisma.partnerPayoutRequest.create({
      data: { referralPartnerId: partnerId, requestedByAccountId: "acct_x", amountCents: 7_000, currency: "USD" },
    });

    const result = await declinePartnerPayoutRequest({
      requestId: request.id,
      reason: "Bank details look wrong",
      declinedByEmail: "admin@bluepass.co",
    });

    expect(result.ok).toBe(true);
    const after = await prisma.partnerPayoutRequest.findUniqueOrThrow({ where: { id: request.id } });
    expect(after).toMatchObject({
      status: "DECLINED",
      declinedBy: "admin@bluepass.co",
      declineReason: "Bank details look wrong",
    });
  });
});
