import {
  CONSERVATION_PCT,
  PARTNER_COMMISSION_PCT,
  PAYMENT_PROCESSING_PCT,
  PLATFORM_FEE_PCT,
  STRIPE_FIXED_FEE_USD,
  STRIPE_PERCENT_FEE,
  type BookingMarket,
} from "@/lib/constants/economics";

/** Mirrors kai's BluePassLedgerMarket (src/core/bluepass/ledger.ts). */
export type BookingSplitMarket = BookingMarket;

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
 * `market` picks the rate: AUSTRALIA, or none given, is 20%/80%; INDONESIA and BARBADOS are 18%/82%
 * (a lower platform fee only), per Tony on 2026-11-10. See economics.ts for the history.
 */
export function splitBooking(totalUsd: number, partnerAttributed = false, market?: BookingSplitMarket): BookingSplit {
  if (!Number.isFinite(totalUsd) || totalUsd < 0) {
    throw new Error("Booking total must be a non-negative finite number.");
  }

  const fees = PLATFORM_FEE_PCT[market ?? "AUSTRALIA"];

  const conservation = totalUsd * CONSERVATION_PCT;
  const partnerShare = partnerAttributed ? totalUsd * PARTNER_COMMISSION_PCT : 0;
  const paymentProcessing = totalUsd * PAYMENT_PROCESSING_PCT;
  const commission = totalUsd * (partnerAttributed ? fees.referred : fees.unreferred);
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
