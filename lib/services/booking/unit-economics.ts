import {
  AU_PLATFORM_FEE_PCT_REFERRED,
  AU_PLATFORM_FEE_PCT_UNREFERRED,
  CONSERVATION_PCT,
  PARTNER_COMMISSION_PCT,
  PAYMENT_PROCESSING_PCT,
  PLATFORM_FEE_PCT_REFERRED,
  PLATFORM_FEE_PCT_UNREFERRED,
  STRIPE_FIXED_FEE_USD,
  STRIPE_PERCENT_FEE,
} from "@/lib/constants/economics";

/** Mirrors kai's BluePassLedgerMarket (src/core/bluepass/ledger.ts). */
export type BookingSplitMarket = "AUSTRALIA" | "INDONESIA";

export type BookingSplit = {
  total: number;
  operatorNet: number;
  /** BluePass's own platform-fee cut (5% referred / 10% unreferred) - not the partner's share. */
  commission: number;
  partnerShare: number;
  conservation: number;
  paymentProcessing: number;
  /** Real Stripe-rate estimate, informational only - distinct from the internal 3% payments line. */
  stripeEstimatedFee: number;
};

const roundCurrency = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

/**
 * `market` is opt-in only, same convention as kai's ledger.ts. As of 2026-08-24 every market
 * (AU, Indonesia, and no market at all) is on the same 20%/80% split - see economics.ts's comment
 * for the full history, including why an earlier "Boattime stays frozen on the old rate" carve-out
 * turned out to have no real source and was removed. `market` no longer changes the numbers this
 * function returns; it's kept as a parameter only so kai's mirrored ledger.ts and this file stay
 * structurally comparable, in case a real future region-specific split needs it again.
 */
export function splitBooking(totalUsd: number, partnerAttributed = false, market?: BookingSplitMarket): BookingSplit {
  if (!Number.isFinite(totalUsd) || totalUsd < 0) {
    throw new Error("Booking total must be a non-negative finite number.");
  }

  const platformFeePctReferred = market === "AUSTRALIA" ? AU_PLATFORM_FEE_PCT_REFERRED : PLATFORM_FEE_PCT_REFERRED;
  const platformFeePctUnreferred =
    market === "AUSTRALIA" ? AU_PLATFORM_FEE_PCT_UNREFERRED : PLATFORM_FEE_PCT_UNREFERRED;

  const conservation = totalUsd * CONSERVATION_PCT;
  const partnerShare = partnerAttributed ? totalUsd * PARTNER_COMMISSION_PCT : 0;
  const paymentProcessing = totalUsd * PAYMENT_PROCESSING_PCT;
  const commission = totalUsd * (partnerAttributed ? platformFeePctReferred : platformFeePctUnreferred);
  // Derived as the remainder (not a separate totalUsd * 0.82) so the four buckets always sum to
  // exactly totalUsd, with no rounding leakage between them.
  const operatorNet = totalUsd - conservation - partnerShare - paymentProcessing - commission;
  const stripeEstimatedFee = totalUsd * STRIPE_PERCENT_FEE + STRIPE_FIXED_FEE_USD;

  return {
    total: roundCurrency(totalUsd),
    operatorNet: roundCurrency(operatorNet),
    commission: roundCurrency(commission),
    partnerShare: roundCurrency(partnerShare),
    conservation: roundCurrency(conservation),
    paymentProcessing: roundCurrency(paymentProcessing),
    stripeEstimatedFee: roundCurrency(stripeEstimatedFee),
  };
}
