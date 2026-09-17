import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db/prisma";
import type { KaiCorePmsBookingLedgerEntry } from "@/lib/services/kai-core/client";
import { loadPartnerCommissionSummary, loadPartnerReferralLinks } from "./dashboard";

/**
 * The referral-link cases use real rows behind the usual prefix; the commission cases inject a fake
 * AU ledger loader, the same way operator/dashboard.test.ts injects a fake Kai ledger loader rather
 * than reaching Kai over the network.
 */
const EMAIL_PREFIX = "partner-dashboard-test+";

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
      role: "PARTNER",
      name: `Dashboard Test ${randomUUID()}`,
      email: `${EMAIL_PREFIX}${randomUUID()}@partners.bluepass.co`,
    },
    select: { id: true },
  });

  return partner.id;
}

function auEntry(overrides: Partial<KaiCorePmsBookingLedgerEntry> = {}): KaiCorePmsBookingLedgerEntry {
  return {
    id: `led_${randomUUID()}`,
    kind: "PARTNER_COMMISSION_ESTIMATE",
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

describe("loadPartnerReferralLinks", () => {
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

    const links = await loadPartnerReferralLinks(partnerId);

    expect(links).toHaveLength(1);
    expect(links[0]).toMatchObject({ code: link.code, label: "Main link", active: true, clickCount: 2 });
    expect(links[0].shareUrl).toContain(`ref=${link.code}`);
  });

  it("returns an empty array for a null partner id rather than querying anything", async () => {
    expect(await loadPartnerReferralLinks(null)).toEqual([]);
  });

  it("returns an empty array for a partner with no links yet", async () => {
    expect(await loadPartnerReferralLinks(await referralPartner())).toEqual([]);
  });
});

describe("loadPartnerCommissionSummary", () => {
  it("returns nothing for a null partner id without calling the AU loader", async () => {
    const listAuLedger = vi.fn(async () => [auEntry()]);

    const summary = await loadPartnerCommissionSummary(null, listAuLedger);

    expect(summary).toEqual({ entries: [], totalCentsByCurrency: {} });
    expect(listAuLedger).not.toHaveBeenCalled();
  });

  it("merges Indonesia (real DB) and AU (injected) entries, newest first, totalled per currency", async () => {
    const partnerId = await referralPartner();
    await prisma.commissionLedgerEntry.create({
      data: {
        referralPartnerId: partnerId,
        role: "PARTNER",
        kind: "PARTNER_COMMISSION_ESTIMATE",
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

    const summary = await loadPartnerCommissionSummary(partnerId, listAuLedger);

    expect(summary.entries).toHaveLength(2);
    // Newest (AU, 19th) first.
    expect(summary.entries[0]).toMatchObject({ region: "au", label: "Gold Coast Whale Escape" });
    expect(summary.entries[1]).toMatchObject({ region: "indonesia", label: null });
    expect(summary.totalCentsByCurrency).toEqual({ AUD: 5_000, USD: 12_000 });
  });

  /**
   * Regression: buildLedgerEntry in commission-ledger.ts stamps referralPartnerId onto every line
   * for a booking this partner referred (conservation, platform commission, payment processing,
   * operator payout), not just the partner's own share - a naive `where: { referralPartnerId }`
   * query would sum all of those into "what you've earned", vastly overstating it.
   */
  it("excludes non-partner ledger kinds tied to the same referral, even though they share referralPartnerId", async () => {
    const partnerId = await referralPartner();
    await prisma.commissionLedgerEntry.createMany({
      data: [
        {
          referralPartnerId: partnerId,
          role: "PARTNER",
          kind: "PARTNER_COMMISSION_ESTIMATE",
          amountCents: 1_000,
          currency: "USD",
          status: "PENDING",
        },
        {
          referralPartnerId: partnerId,
          role: "ADMIN",
          kind: "BLUEPASS_PLATFORM_COMMISSION",
          amountCents: 8_400,
          currency: "USD",
          status: "PENDING",
        },
        {
          referralPartnerId: partnerId,
          kind: "CONSERVATION_ALLOCATION",
          amountCents: 3_500,
          currency: "USD",
          status: "PENDING",
        },
        {
          referralPartnerId: partnerId,
          role: "OPERATOR",
          kind: "OPERATOR_PAYOUT_PLACEHOLDER",
          amountCents: 56_000,
          currency: "USD",
          status: "PENDING",
        },
      ],
    });

    const summary = await loadPartnerCommissionSummary(partnerId, async () => []);

    expect(summary.entries).toHaveLength(1);
    expect(summary.entries[0].kind).toBe("PARTNER_COMMISSION_ESTIMATE");
    expect(summary.totalCentsByCurrency).toEqual({ USD: 1_000 });
  });

  it("still returns the Indonesia total when the AU loader fails", async () => {
    const partnerId = await referralPartner();
    await prisma.commissionLedgerEntry.create({
      data: {
        referralPartnerId: partnerId,
        role: "PARTNER",
        kind: "PARTNER_COMMISSION_ESTIMATE",
        amountCents: 3_000,
        currency: "USD",
        status: "ESTIMATED",
      },
    });
    const listAuLedger = vi.fn(async () => {
      throw new Error("Kai Core referral-partner PMS booking ledger request failed.");
    });

    const summary = await loadPartnerCommissionSummary(partnerId, listAuLedger);

    expect(summary.entries).toHaveLength(1);
    expect(summary.totalCentsByCurrency).toEqual({ USD: 3_000 });
  });
});
