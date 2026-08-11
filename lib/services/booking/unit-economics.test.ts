import { describe, expect, it } from "vitest";
import { splitBooking } from "./unit-economics";

describe("splitBooking", () => {
  it("splits an unreferred $1000 booking into the real 18% (5/0/3/10) breakdown, operator keeps 82%", () => {
    const split = splitBooking(1000);

    expect(split.conservation).toBe(50);
    expect(split.creatorShare).toBe(0);
    expect(split.paymentProcessing).toBe(30);
    expect(split.commission).toBe(100);
    expect(split.operatorNet).toBe(820);
  });

  it("splits a referred $1000 booking into the real 18% (5/5/3/5) breakdown, operator still keeps 82%", () => {
    const split = splitBooking(1000, true);

    expect(split.conservation).toBe(50);
    expect(split.creatorShare).toBe(50);
    expect(split.paymentProcessing).toBe(30);
    expect(split.commission).toBe(50);
    expect(split.operatorNet).toBe(820);
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

  it("does not change the default (no market) split - still exactly 18%/82%", () => {
    const withoutMarket = splitBooking(1000, true);
    const explicitIndonesia = splitBooking(1000, true, "INDONESIA");

    for (const split of [withoutMarket, explicitIndonesia]) {
      expect(split.commission).toBe(50);
      expect(split.operatorNet).toBe(820);
    }
  });

  it("keeps a real, separate Stripe fee estimate distinct from the internal payment-processing line", () => {
    const split = splitBooking(1000);

    expect(split.stripeEstimatedFee).toBeCloseTo(1000 * 0.029 + 0.3, 5);
    expect(split.stripeEstimatedFee).not.toBe(split.paymentProcessing);
  });
});
