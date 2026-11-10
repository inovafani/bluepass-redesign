import { describe, expect, it } from "vitest";
import { marketForCurrency } from "@/lib/constants/economics";
import { splitOnlineBooking } from "@/lib/services/rails/money";
import { splitBooking } from "./unit-economics";

describe("splitBooking", () => {
  // Australia, and any booking with no market, is 20%/80%. Per Tony (2026-11-10) Indonesia and
  // Barbados are 18%/82%: only the platform fee drops (5% referred / 10% unreferred).
  it("splits an unreferred $1000 booking into the real 20% (5/0/3/12) breakdown, operator keeps 80%", () => {
    const split = splitBooking(1000);

    expect(split.conservation).toBe(50);
    expect(split.partnerShare).toBe(0);
    expect(split.paymentProcessing).toBe(30);
    expect(split.commission).toBe(120);
    expect(split.operatorNet).toBe(800);
  });

  it("splits a referred $1000 booking into the real 20% (5/5/3/7) breakdown, operator still keeps 80%", () => {
    const split = splitBooking(1000, true);

    expect(split.conservation).toBe(50);
    expect(split.partnerShare).toBe(50);
    expect(split.paymentProcessing).toBe(30);
    expect(split.commission).toBe(70);
    expect(split.operatorNet).toBe(800);
  });

  it("splits a referred $1000 AU booking into 20% (5/5/3/7), operator keeps 80%", () => {
    const split = splitBooking(1000, true, "AUSTRALIA");

    expect(split.conservation).toBe(50);
    expect(split.partnerShare).toBe(50);
    expect(split.paymentProcessing).toBe(30);
    expect(split.commission).toBe(70);
    expect(split.operatorNet).toBe(800);
  });

  it("splits an unreferred $1000 AU booking with a 12% platform fee, operator still keeps 80%", () => {
    const split = splitBooking(1000, false, "AUSTRALIA");

    expect(split.commission).toBe(120);
    expect(split.operatorNet).toBe(800);
  });

  it("is 20%/80% with no market or AUSTRALIA, and 18%/82% for INDONESIA and BARBADOS", () => {
    for (const market of [undefined, "AUSTRALIA"] as const) {
      expect(splitBooking(1000, true, market)).toMatchObject({ commission: 70, operatorNet: 800 });
      expect(splitBooking(1000, false, market)).toMatchObject({ commission: 120, operatorNet: 800 });
    }
    for (const market of ["INDONESIA", "BARBADOS"] as const) {
      expect(splitBooking(1000, true, market)).toMatchObject({ conservation: 50, partnerShare: 50, paymentProcessing: 30, commission: 50, operatorNet: 820 });
      expect(splitBooking(1000, false, market)).toMatchObject({ conservation: 50, partnerShare: 0, paymentProcessing: 30, commission: 100, operatorNet: 820 });
    }
  });

  it("reads the market from an unambiguous currency only; USD keeps the 20% default", () => {
    expect(marketForCurrency("aud")).toBe("AUSTRALIA");
    expect(marketForCurrency("IDR")).toBe("INDONESIA");
    expect(marketForCurrency("BBD")).toBe("BARBADOS");
    expect(marketForCurrency("USD")).toBeUndefined();
    expect(marketForCurrency(undefined)).toBeUndefined();
  });

  it("splits a native booking by its currency: A$ keeps 80%, BBD and IDR keep 82%, USD keeps 80%", () => {
    expect(splitOnlineBooking(100000, "AUD").operatorNetCents).toBe(80000);
    expect(splitOnlineBooking(100000, "BBD").operatorNetCents).toBe(82000);
    expect(splitOnlineBooking(100000, "IDR").operatorNetCents).toBe(82000);
    expect(splitOnlineBooking(100000, "USD").operatorNetCents).toBe(80000);
    expect(splitOnlineBooking(100000).operatorNetCents).toBe(80000);
    expect(splitOnlineBooking(100000, "BBD").conservationCents).toBe(5000);
  });

  it("keeps a real, separate Stripe fee estimate distinct from the internal payment-processing line", () => {
    const split = splitBooking(1000);

    expect(split.stripeEstimatedFee).toBeCloseTo(1000 * 0.029 + 0.3, 5);
    expect(split.stripeEstimatedFee).not.toBe(split.paymentProcessing);
  });
});
