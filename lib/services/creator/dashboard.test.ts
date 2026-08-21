import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db/prisma";
import type { KaiCorePmsBookingLedgerEntry } from "@/lib/services/kai-core/client";
import { loadCreatorCommissionSummary, loadCreatorReferralLinks } from "./dashboard";

/**
 * The referral-link cases use real rows behind the usual prefix; the commission cases inject a fake
 * AU ledger loader, the same way operator/dashboard.test.ts injects a fake Kai ledger loader rather
 * than reaching Kai over the network.
 */
const EMAIL_PREFIX = "creator-dashboard-test+";

afterAll(async () => {
  const partners = await prisma.referralPartner.findMany({
    where: { email: { startsWith: EMAIL_PREFIX } },
    select: { id: true },
  });
  const partnerIds = partners.map((p) => p.id);
  if (partnerIds.length > 0) {
    await prisma.commissionLedgerEntry.deleteMany({ where: { referralPartnerId: { in: partnerIds } } });
    await prisma.referralClick.deleteMany({ where: { referralPartnerId: { in: partnerIds } } });
    await prisma.referralLink.deleteMany({ where: { partnerId: { in: partnerIds } } });
    await prisma.referralPartner.deleteMany({ where: { id: { in: partnerIds } } });
  }
});

async function referralPartner() {
  const partner = await prisma.referralPartner.create({
    data: {
      role: "CREATOR",
      name: `Dashboard Test ${randomUUID()}`,
      email: `${EMAIL_PREFIX}${randomUUID()}@creators.bluepass.co`,
    },
    select: { id: true },
  });

  return partner.id;
}

function auEntry(overrides: Partial<KaiCorePmsBookingLedgerEntry> = {}): KaiCorePmsBookingLedgerEntry {
  return {
    id: `led_${randomUUID()}`,
    kind: "CREATOR_COMMISSION_ESTIMATE",
    amountCents: 5_000,
    currency: "AUD",
    status: "FINALIZED",
    paidOutAt: null,
    paidOutReference: null,
    paidOutBy: null,
    createdAt: "2026-08-19T00:00:00.000Z",
    pmsBookingPaymentAttemptId: "att_1",
    attempt: {
      productTitle: "Gold Coast Whale Escape",
      dateText: "22 Aug 2026",
      guests: 2,
      travellerName: "Jo Traveller",
      externalBookingId: "RZD-991",
      grossAmountCents: 15_900,
      settledAt: null,
    },
    payout: null,
    ...overrides,
  };
}

describe("loadCreatorReferralLinks", () => {
  it("returns each link with a real click count and a working share URL", async () => {
    const partnerId = await referralPartner();
    const link = await prisma.referralLink.create({
      data: { partnerId, code: `dashboard-test-${randomUUID()}`, label: "Main link" },
    });
    await prisma.referralClick.createMany({
      data: [
        { referralLinkId: link.id, referralPartnerId: partnerId, code: link.code },
        { referralLinkId: link.id, referralPartnerId: partnerId, code: link.code },
      ],
    });

    const links = await loadCreatorReferralLinks(partnerId);

    expect(links).toHaveLength(1);
    expect(links[0]).toMatchObject({ code: link.code, label: "Main link", active: true, clickCount: 2 });
    expect(links[0].shareUrl).toContain(`ref=${link.code}`);
  });

  it("returns an empty array for a null partner id rather than querying anything", async () => {
    expect(await loadCreatorReferralLinks(null)).toEqual([]);
  });

  it("returns an empty array for a partner with no links yet", async () => {
    expect(await loadCreatorReferralLinks(await referralPartner())).toEqual([]);
  });
});

describe("loadCreatorCommissionSummary", () => {
  it("returns nothing for a null partner id without calling the AU loader", async () => {
    const listAuLedger = vi.fn(async () => [auEntry()]);

    const summary = await loadCreatorCommissionSummary(null, listAuLedger);

    expect(summary).toEqual({ entries: [], totalCentsByCurrency: {} });
    expect(listAuLedger).not.toHaveBeenCalled();
  });

  it("merges Indonesia (real DB) and AU (injected) entries, newest first, totalled per currency", async () => {
    const partnerId = await referralPartner();
    await prisma.commissionLedgerEntry.create({
      data: {
        referralPartnerId: partnerId,
        role: "CREATOR",
        kind: "CREATOR_COMMISSION_ESTIMATE",
        amountCents: 12_000,
        currency: "USD",
        status: "ESTIMATED",
        createdAt: new Date("2026-08-18T00:00:00.000Z"),
      },
    });
    const listAuLedger = vi.fn(async (input: { referralPartnerId: string }) => {
      expect(input.referralPartnerId).toBe(partnerId);
      return [auEntry({ createdAt: "2026-08-19T00:00:00.000Z" })];
    });

    const summary = await loadCreatorCommissionSummary(partnerId, listAuLedger);

    expect(summary.entries).toHaveLength(2);
    // Newest (AU, 19th) first.
    expect(summary.entries[0]).toMatchObject({ region: "au", label: "Gold Coast Whale Escape" });
    expect(summary.entries[1]).toMatchObject({ region: "indonesia", label: null });
    expect(summary.totalCentsByCurrency).toEqual({ AUD: 5_000, USD: 12_000 });
  });

  it("still returns the Indonesia total when the AU loader fails", async () => {
    const partnerId = await referralPartner();
    await prisma.commissionLedgerEntry.create({
      data: {
        referralPartnerId: partnerId,
        role: "CREATOR",
        kind: "CREATOR_COMMISSION_ESTIMATE",
        amountCents: 3_000,
        currency: "USD",
        status: "ESTIMATED",
      },
    });
    const listAuLedger = vi.fn(async () => {
      throw new Error("Kai Core referral-partner PMS booking ledger request failed.");
    });

    const summary = await loadCreatorCommissionSummary(partnerId, listAuLedger);

    expect(summary.entries).toHaveLength(1);
    expect(summary.totalCentsByCurrency).toEqual({ USD: 3_000 });
  });
});
