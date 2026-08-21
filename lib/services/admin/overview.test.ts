import { describe, expect, it } from "vitest";
import { foldMoneyByCurrency } from "./overview";
import type { KaiCorePlatformStats } from "@/lib/services/kai-core/client";

function stats(overrides: Partial<KaiCorePlatformStats> = {}): KaiCorePlatformStats {
  return {
    au: { totalsByKindAndCurrency: [], bookingCount: 0 },
    indonesia: { totalsByKindAndCurrency: [], bookingCount: 0 },
    ...overrides,
  };
}

describe("foldMoneyByCurrency", () => {
  it("sums matching kinds within AU across multiple currency rows", () => {
    const rows = foldMoneyByCurrency(
      stats({
        au: {
          bookingCount: 2,
          totalsByKindAndCurrency: [
            { kind: "CONSERVATION_ALLOCATION", currency: "AUD", amountCents: 500 },
            { kind: "CONSERVATION_ALLOCATION", currency: "AUD", amountCents: 300 },
          ],
        },
      }),
    );

    expect(rows).toEqual([
      { currency: "AUD", conservationCents: 800, operatorPayoutCents: 0, platformCommissionCents: 0, creatorCommissionCents: 0 },
    ]);
  });

  it("ignores Indonesia entirely, even when it carries real-looking totals", () => {
    // Indonesia's ledger is fully test-data-polluted as of 2026-08-19 (see the function's own doc
    // comment) - this is the regression test for "don't show it on the page again by accident".
    const rows = foldMoneyByCurrency(
      stats({
        au: { bookingCount: 0, totalsByKindAndCurrency: [] },
        indonesia: {
          bookingCount: 500,
          totalsByKindAndCurrency: [{ kind: "OPERATOR_PAYOUT_PLACEHOLDER", currency: "USD", amountCents: 999_999_999 }],
        },
      }),
    );

    expect(rows).toEqual([]);
  });

  it("never merges two different currencies into one row", () => {
    const rows = foldMoneyByCurrency(
      stats({
        au: {
          bookingCount: 2,
          totalsByKindAndCurrency: [
            { kind: "OPERATOR_PAYOUT_PLACEHOLDER", currency: "AUD", amountCents: 8_200 },
            { kind: "OPERATOR_PAYOUT_PLACEHOLDER", currency: "USD", amountCents: 4_100 },
          ],
        },
      }),
    );

    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.currency === "AUD")?.operatorPayoutCents).toBe(8_200);
    expect(rows.find((r) => r.currency === "USD")?.operatorPayoutCents).toBe(4_100);
  });

  it("routes every known kind to its own field, sorted by currency", () => {
    const rows = foldMoneyByCurrency(
      stats({
        au: {
          bookingCount: 1,
          totalsByKindAndCurrency: [
            { kind: "CONSERVATION_ALLOCATION", currency: "AUD", amountCents: 500 },
            { kind: "OPERATOR_PAYOUT_PLACEHOLDER", currency: "AUD", amountCents: 8_200 },
            { kind: "BLUEPASS_PLATFORM_COMMISSION", currency: "AUD", amountCents: 1_590 },
            { kind: "CREATOR_COMMISSION_ESTIMATE", currency: "AUD", amountCents: 500 },
            { kind: "PAYMENT_PROCESSING_ALLOCATION", currency: "AUD", amountCents: 477 },
          ],
        },
      }),
    );

    expect(rows).toEqual([
      {
        currency: "AUD",
        conservationCents: 500,
        operatorPayoutCents: 8_200,
        platformCommissionCents: 1_590,
        creatorCommissionCents: 500,
        // PAYMENT_PROCESSING_ALLOCATION has no field on this row and is silently dropped - the
        // overview page never claimed to show every ledger kind, only the four investor-facing ones.
      },
    ]);
  });

  it("returns nothing for a platform with no finalised bookings yet", () => {
    expect(foldMoneyByCurrency(stats())).toEqual([]);
  });
});
