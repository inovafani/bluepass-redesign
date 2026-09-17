import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { createPartnerPayoutRequest, getRequestablePartnerBalance } from "./payout-requests";

const EMAIL_PREFIX = "payout-requests-test+";
const NO_AU_LEDGER = async () => [];

afterAll(async () => {
  const partners = await prisma.referralPartner.findMany({
    where: { email: { startsWith: EMAIL_PREFIX } },
    select: { id: true },
  });
  const partnerIds = partners.map((p) => p.id);
  if (partnerIds.length > 0) {
    await prisma.partnerPayoutRequest.deleteMany({ where: { referralPartnerId: { in: partnerIds } } });
    await prisma.commissionLedgerEntry.deleteMany({ where: { referralPartnerId: { in: partnerIds } } });
    await prisma.referralPartner.deleteMany({ where: { id: { in: partnerIds } } });
  }
});

async function referralPartner() {
  const partner = await prisma.referralPartner.create({
    data: {
      role: "PARTNER",
      name: `Payout Requests Test ${randomUUID()}`,
      email: `${EMAIL_PREFIX}${randomUUID()}@partners.bluepass.co`,
    },
    select: { id: true },
  });

  return partner.id;
}

async function commissionEntry(partnerId: string, amountCents: number, currency = "USD") {
  await prisma.commissionLedgerEntry.create({
    data: {
      referralPartnerId: partnerId,
      role: "PARTNER",
      kind: "PARTNER_COMMISSION_ESTIMATE",
      amountCents,
      currency,
      status: "PENDING",
    },
  });
}

describe("getRequestablePartnerBalance", () => {
  it("reports the full accrued amount as available when nothing has been requested yet", async () => {
    const partnerId = await referralPartner();
    await commissionEntry(partnerId, 12_000);

    const [balance] = await getRequestablePartnerBalance(partnerId, NO_AU_LEDGER);

    expect(balance).toMatchObject({ currency: "USD", accruedCents: 12_000, availableCents: 12_000, canRequest: true });
    expect(balance.pendingRequestedAt).toBeNull();
  });

  it("is below the threshold with only a small amount accrued", async () => {
    const partnerId = await referralPartner();
    await commissionEntry(partnerId, 1_500);

    const [balance] = await getRequestablePartnerBalance(partnerId, NO_AU_LEDGER);

    expect(balance.canRequest).toBe(false);
  });

  it("subtracts a PAID request from what's still available, so it can't be requested twice", async () => {
    const partnerId = await referralPartner();
    await commissionEntry(partnerId, 10_000);
    await prisma.partnerPayoutRequest.create({
      data: {
        referralPartnerId: partnerId,
        requestedByAccountId: "acct_test",
        amountCents: 10_000,
        currency: "USD",
        status: "PAID",
        paidAt: new Date(),
        paidBy: "admin@bluepass.co",
      },
    });

    const [balance] = await getRequestablePartnerBalance(partnerId, NO_AU_LEDGER);

    expect(balance.availableCents).toBe(0);
    expect(balance.canRequest).toBe(false);
  });

  it("reports a pending request's date and blocks a new request for that currency", async () => {
    const partnerId = await referralPartner();
    await commissionEntry(partnerId, 10_000);
    const requestedAt = new Date("2026-09-01T00:00:00.000Z");
    await prisma.partnerPayoutRequest.create({
      data: {
        referralPartnerId: partnerId,
        requestedByAccountId: "acct_test",
        amountCents: 10_000,
        currency: "USD",
        status: "PENDING",
        createdAt: requestedAt,
      },
    });

    const [balance] = await getRequestablePartnerBalance(partnerId, NO_AU_LEDGER);

    expect(balance.canRequest).toBe(false);
    expect(balance.pendingRequestedAt).toEqual(requestedAt);
  });
});

describe("createPartnerPayoutRequest", () => {
  it("creates a request for the entire available balance, ignoring any client-supplied amount", async () => {
    const partnerId = await referralPartner();
    await commissionEntry(partnerId, 9_000);

    const result = await createPartnerPayoutRequest(
      partnerId,
      { currency: "USD", requestedByAccountId: "acct_test" },
      NO_AU_LEDGER,
    );

    expect(result.ok).toBe(true);

    const request = await prisma.partnerPayoutRequest.findFirstOrThrow({ where: { referralPartnerId: partnerId } });
    expect(request).toMatchObject({ amountCents: 9_000, currency: "USD", status: "PENDING" });
  });

  it("rejects a request below the minimum threshold", async () => {
    const partnerId = await referralPartner();
    await commissionEntry(partnerId, 1_000);

    const result = await createPartnerPayoutRequest(
      partnerId,
      { currency: "USD", requestedByAccountId: "acct_test" },
      NO_AU_LEDGER,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/at least/i);

    expect(await prisma.partnerPayoutRequest.count({ where: { referralPartnerId: partnerId } })).toBe(0);
  });

  it("rejects a second request while one is already pending for the same currency", async () => {
    const partnerId = await referralPartner();
    await commissionEntry(partnerId, 20_000);

    const first = await createPartnerPayoutRequest(
      partnerId,
      { currency: "USD", requestedByAccountId: "acct_test" },
      NO_AU_LEDGER,
    );
    expect(first.ok).toBe(true);

    const second = await createPartnerPayoutRequest(
      partnerId,
      { currency: "USD", requestedByAccountId: "acct_test" },
      NO_AU_LEDGER,
    );

    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.error).toMatch(/already have a payout request pending/i);
    expect(await prisma.partnerPayoutRequest.count({ where: { referralPartnerId: partnerId } })).toBe(1);
  });

  it("rejects a currency with no commission on file at all", async () => {
    const partnerId = await referralPartner();

    const result = await createPartnerPayoutRequest(
      partnerId,
      { currency: "USD", requestedByAccountId: "acct_test" },
      NO_AU_LEDGER,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/no commission on file/i);
  });
});
