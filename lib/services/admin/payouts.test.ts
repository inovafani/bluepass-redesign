import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { listCommissionLedgerEntries } from "@/lib/services/referrals/commission-ledger";
import {
  formatMoneyFromCents,
  formatRelativeTime,
  isLedgerStatusFilter,
  loadCommissionLedger,
  loadCronHealth,
  toAustraliaLedgerRow,
  toIndonesiaLedgerRow,
} from "./payouts";
import type {
  KaiCoreBluePassLedgerEntry,
  KaiCorePmsBookingLedgerEntry,
} from "@/lib/services/kai-core/client";

/**
 * The database-backed cases follow the same convention as review-queue.test.ts: real rows, a
 * distinctive prefix, an afterAll that removes them. The normaliser cases are pure and need nothing.
 */
const EMAIL_PREFIX = "admin-payouts-test+";
const LEDGER_KIND_PREFIX = "ADMIN_PAYOUTS_TEST_";

afterAll(async () => {
  await prisma.commissionLedgerEntry.deleteMany({ where: { kind: { startsWith: LEDGER_KIND_PREFIX } } });
  const accounts = await prisma.bluePassAccount.findMany({
    where: { email: { startsWith: EMAIL_PREFIX } },
    select: { id: true },
  });
  await prisma.bluePassAccount.deleteMany({ where: { id: { in: accounts.map((a) => a.id) } } });
});

function auEntry(overrides: Partial<KaiCorePmsBookingLedgerEntry> = {}): KaiCorePmsBookingLedgerEntry {
  return {
    id: "led_au",
    kind: "OPERATOR_PAYOUT_PLACEHOLDER",
    amountCents: 45_000,
    currency: "AUD",
    status: "PENDING",
    paidOutAt: null,
    paidOutReference: null,
    paidOutBy: null,
    createdAt: "2026-08-10T00:00:00.000Z",
    pmsBookingPaymentAttemptId: "att_1",
    attempt: {
      productTitle: "Whitsundays Day Sail",
      dateText: "12 Aug 2026",
      guests: 4,
      travellerName: "Jo Traveller",
      externalBookingId: "RZD-991",
      grossAmountCents: 60_000,
      settledAt: null,
    },
    payout: {
      status: "PENDING",
      stripeTransferId: null,
      releasedAt: null,
      releasedBy: null,
      failureReason: null,
    },
    ...overrides,
  };
}

function idEntry(overrides: Partial<KaiCoreBluePassLedgerEntry> = {}): KaiCoreBluePassLedgerEntry {
  return {
    id: "led_id",
    kind: "OPERATOR_PAYOUT_PLACEHOLDER",
    amountCents: 1_250_000,
    currency: "IDR",
    status: "PENDING",
    paidOutAt: null,
    paidOutReference: null,
    paidOutBy: null,
    createdAt: "2026-08-11T00:00:00.000Z",
    inquiry: {
      id: "inq_1",
      selectedYachtName: "Ocean Pearl",
      operatorName: "Komodo Charters",
      operatorPhone: "+6281100011",
      destination: "Labuan Bajo",
      status: "CONFIRMED",
    },
    ...overrides,
  };
}

describe("toAustraliaLedgerRow", () => {
  it("offers a settle action on an unpaid operator-payout line, keyed on the attempt id", () => {
    const row = toAustraliaLedgerRow(auEntry(), "boattime");

    expect(row.action).toEqual({ type: "au-settle", attemptId: "att_1" });
    expect(row.title).toBe("Whitsundays Day Sail");
    expect(row.tenantSlug).toBe("boattime");
    expect(row.facts.map((f) => f.label)).toEqual(
      expect.arrayContaining(["Traveller", "Date", "Guests", "Booking ref", "Gross"]),
    );
  });

  it("offers no action once the booking is already settled", () => {
    const row = toAustraliaLedgerRow(
      auEntry({ attempt: { ...auEntry().attempt!, settledAt: "2026-08-12T00:00:00.000Z" } }),
      "boattime",
    );

    // Releasing a second time would pay the operator twice.
    expect(row.action).toBeNull();
  });

  it("offers no action on a FINALIZED line or on a non-payout kind", () => {
    expect(toAustraliaLedgerRow(auEntry({ status: "FINALIZED" }), "boattime").action).toBeNull();
    expect(
      toAustraliaLedgerRow(auEntry({ kind: "BLUEPASS_PLATFORM_COMMISSION" }), "boattime").action,
    ).toBeNull();
  });

  it("offers no action on a zero-amount line, which Stripe would reject anyway", () => {
    expect(toAustraliaLedgerRow(auEntry({ amountCents: 0 }), "boattime").action).toBeNull();
  });

  it("surfaces a failed payout's reason ahead of any transfer id", () => {
    const row = toAustraliaLedgerRow(
      auEntry({
        payout: {
          status: "FAILED",
          stripeTransferId: "tr_1",
          releasedAt: null,
          releasedBy: null,
          failureReason: "Destination account cannot receive transfers",
        },
      }),
      "boattime",
    );

    expect(row.payoutStatus).toBe("FAILED");
    expect(row.payoutDetail).toBe("Destination account cannot receive transfers");
  });

  it("survives an entry whose attempt relation is missing", () => {
    const row = toAustraliaLedgerRow(auEntry({ attempt: null }), "boattime");

    expect(row.title).toBe("Booking");
    expect(row.action).toEqual({ type: "au-settle", attemptId: "att_1" });
  });
});

describe("toIndonesiaLedgerRow", () => {
  it("offers a release action on a pending operator-payout line, keyed on the entry id", () => {
    const row = toIndonesiaLedgerRow(idEntry(), "bluepass");

    expect(row.action).toEqual({ type: "id-release", entryId: "led_id" });
    expect(row.title).toBe("Ocean Pearl");
    expect(row.facts.find((f) => f.label === "Operator")?.value).toBe("Komodo Charters");
  });

  it("offers no action on other ledger kinds or non-pending statuses", () => {
    expect(toIndonesiaLedgerRow(idEntry({ kind: "CONSERVATION_ALLOCATION" }), "bluepass").action).toBeNull();
    expect(toIndonesiaLedgerRow(idEntry({ status: "VOIDED" }), "bluepass").action).toBeNull();
  });

  it("offers no action on a zero-amount line", () => {
    /* Most PENDING lines in the real Indonesia ledger are amountCents 0 - offering a release there
       would put a money button on 68 rows that cannot possibly pay anyone. */
    expect(toIndonesiaLedgerRow(idEntry({ amountCents: 0 }), "bluepass").action).toBeNull();
  });

  it("survives an entry with no inquiry attached", () => {
    const row = toIndonesiaLedgerRow(idEntry({ inquiry: null }), "bluepass");

    expect(row.title).toBe("Inquiry");
    expect(row.facts.every((f) => f.value.trim().length > 0)).toBe(true);
  });
});

describe("formatMoneyFromCents", () => {
  it("divides by 100 and shows the currency rather than printing raw cents", () => {
    expect(formatMoneyFromCents(45_000, "AUD")).toContain("450");
    expect(formatMoneyFromCents(45_000, "AUD")).toContain("AUD");
  });

  it("does not throw on an unrecognised currency code", () => {
    expect(formatMoneyFromCents(1_000, "NOTACURRENCY")).toBe("NOTACURRENCY 10.00");
  });

  it("handles zero and negative amounts", () => {
    expect(formatMoneyFromCents(0, "USD")).toContain("0");
    expect(formatMoneyFromCents(-2_500, "USD")).toContain("25");
  });
});

describe("formatRelativeTime", () => {
  it("reports never for a missing timestamp rather than an epoch date", () => {
    expect(formatRelativeTime(null)).toBe("never");
  });

  it("describes recent and old timestamps in the right unit", () => {
    expect(formatRelativeTime(new Date(Date.now() - 5 * 60_000))).toBe("5m ago");
    expect(formatRelativeTime(new Date(Date.now() - 5 * 3_600_000))).toBe("5h ago");
    expect(formatRelativeTime(new Date(Date.now() - 5 * 86_400_000))).toBe("5d ago");
  });
});

describe("isLedgerStatusFilter", () => {
  it("accepts the real statuses plus ALL and rejects anything else", () => {
    expect(isLedgerStatusFilter("PENDING")).toBe(true);
    expect(isLedgerStatusFilter("ALL")).toBe(true);
    expect(isLedgerStatusFilter("pending")).toBe(false);
    expect(isLedgerStatusFilter(undefined)).toBe(false);
  });
});

describe("loadCronHealth", () => {
  it("isolates a Kai failure so the local jobs still report", async () => {
    /* KAI_CORE_ADMIN_TOKEN is genuinely absent in the test process, so the Kai half throws for real
       rather than being stubbed - which is exactly the state a misconfigured deployment is in. */
    const health = await loadCronHealth();

    expect(health.kai.ok).toBe(false);
    if (!health.kai.ok) {
      expect(health.kai.message).toBeTruthy();
    }

    // The local half is a direct Prisma read and must be unaffected by Kai being unreachable.
    expect(health.local.ok).toBe(true);
    if (health.local.ok) {
      const names = health.local.data.map((row) => row.jobName);
      // Both expected local jobs appear even if one has never logged a run.
      expect(names).toContain("rezdy-agent-sync");
      expect(names).toContain("bokun-sync");
      for (const row of health.local.data) {
        expect(["SUCCESS", "PARTIAL", "FAILURE", "NEVER_RUN"]).toContain(row.status);
      }
      // Broken jobs sort ahead of healthy ones.
      const severity = { FAILURE: 0, NEVER_RUN: 1, PARTIAL: 2, SUCCESS: 3 } as const;
      const ranks = health.local.data.map((row) => severity[row.status]);
      expect([...ranks]).toEqual([...ranks].sort((a, b) => a - b));
    }
  });
});

describe("listCommissionLedgerEntries", () => {
  it("reads back rows the sync writes, newest first, with the account joined", async () => {
    const account = await prisma.bluePassAccount.create({
      data: {
        email: `${EMAIL_PREFIX}${randomUUID()}@ops.bluepass.co`,
        passwordHash: randomUUID(),
        displayName: "Admin Payouts Test",
      },
    });

    await prisma.commissionLedgerEntry.create({
      data: {
        accountId: account.id,
        kind: `${LEDGER_KIND_PREFIX}OLDER`,
        amountCents: 1_000,
        currency: "USD",
        status: "PENDING",
        createdAt: new Date(Date.now() - 60_000),
      },
    });
    await prisma.commissionLedgerEntry.create({
      data: {
        accountId: account.id,
        kind: `${LEDGER_KIND_PREFIX}NEWER`,
        amountCents: 2_500,
        currency: "USD",
        status: "PENDING",
      },
    });

    const entries = await listCommissionLedgerEntries({ take: 200 });
    const mine = entries.filter((e) => e.kind.startsWith(LEDGER_KIND_PREFIX));

    expect(mine).toHaveLength(2);
    expect(mine[0].kind).toBe(`${LEDGER_KIND_PREFIX}NEWER`);
    expect(mine[0].account?.email).toBe(account.email);
  });

  it("filters by kind when asked", async () => {
    const filtered = await listCommissionLedgerEntries({ kind: `${LEDGER_KIND_PREFIX}NEWER` });

    expect(filtered.every((e) => e.kind === `${LEDGER_KIND_PREFIX}NEWER`)).toBe(true);
  });

  it("loads through the page's own section wrapper without throwing", async () => {
    const result = await loadCommissionLedger();

    expect(result.ok).toBe(true);
  });
});
