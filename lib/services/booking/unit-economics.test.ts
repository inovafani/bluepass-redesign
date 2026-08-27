import { describe, expect, it } from "vitest";
import { splitBooking } from "./unit-economics";

describe("splitBooking", () => {
  // Indonesia was corrected from 18%/82% to 20%/80% on 2026-08-24 (Tony: "Indonesia ternyata 20%
  // juga, bukan 18%"), matching AU's earlier 2026-08-05 move - so the no-market default below is now
  // the same 20%/80% split as an explicit "AUSTRALIA"/"INDONESIA" market.
  it("splits an unreferred $1000 booking into the real 20% (5/0/3/12) breakdown, operator keeps 80%", () => {
    const split = splitBooking(1000);

    expect(split.conservation).toBe(50);
    expect(split.creatorShare).toBe(0);
    expect(split.paymentProcessing).toBe(30);
    expect(split.commission).toBe(120);
    expect(split.operatorNet).toBe(800);
  });

  it("splits a referred $1000 booking into the real 20% (5/5/3/7) breakdown, operator still keeps 80%", () => {
    const split = splitBooking(1000, true);

    expect(split.conservation).toBe(50);
    expect(split.creatorShare).toBe(50);
    expect(split.paymentProcessing).toBe(30);
    expect(split.commission).toBe(70);
    expect(split.operatorNet).toBe(800);
  });

  it("splits a referred $1000 AU booking into 20% (5/5/3/7), operator keeps 80%", () => {
    const split = splitBooking(1000, true, "AUSTRALIA");

    expect(split.conservation).toBe(50);
    expect(split.creatorShare).toBe(50);
    expect(split.paymentProcessing).toBe(30);
    expect(split.commission).toBe(70);
    expect(split.operatorNet).toBe(800);
  });

  it("splits an unreferred $1000 AU booking with a 12% platform fee, operator still keeps 80%", () => {
    const split = splitBooking(1000, false, "AUSTRALIA");

    expect(split.commission).toBe(120);
    expect(split.operatorNet).toBe(800);
  });

  it("gives the same split with no market, an explicit INDONESIA, or an explicit AUSTRALIA - all 20%/80% now", () => {
    const withoutMarket = splitBooking(1000, true);
    const explicitIndonesia = splitBooking(1000, true, "INDONESIA");
    const explicitAustralia = splitBooking(1000, true, "AUSTRALIA");

    for (const split of [withoutMarket, explicitIndonesia, explicitAustralia]) {
      expect(split.commission).toBe(70);
      expect(split.operatorNet).toBe(800);
    }
  });

  it("keeps a real, separate Stripe fee estimate distinct from the internal payment-processing line", () => {
    const split = splitBooking(1000);

    expect(split.stripeEstimatedFee).toBeCloseTo(1000 * 0.029 + 0.3, 5);
    expect(split.stripeEstimatedFee).not.toBe(split.paymentProcessing);
  });
});
