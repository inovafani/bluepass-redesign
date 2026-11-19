import { describe, expect, it } from "vitest";
import { PARTNER_COMMISSION_PCT } from "@/lib/constants/economics";
import { partnerCommissionCents } from "@/lib/services/referrals/native-commission";

// Pure maths only: the rails suites that touch the database run through vitest.rails.config.ts.
describe("partnerCommissionCents", () => {
  it("is 5% of what the traveller paid", () => {
    expect(PARTNER_COMMISSION_PCT).toBe(0.05);
    expect(partnerCommissionCents(100_00)).toBe(5_00);
    expect(partnerCommissionCents(350_000)).toBe(17_500);
  });

  it("rounds to a whole cent and never goes negative", () => {
    expect(partnerCommissionCents(399)).toBe(20);
    expect(partnerCommissionCents(0)).toBe(0);
  });
});
