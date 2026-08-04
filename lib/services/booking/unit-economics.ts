import {
  CONSERVATION_PCT,
  PARTNER_COMMISSION_PCT,
  PAYMENT_PROCESSING_PCT,
  PLATFORM_FEE_PCT_REFERRED,
  PLATFORM_FEE_PCT_UNREFERRED,
  STRIPE_FIXED_FEE_USD,
  STRIPE_PERCENT_FEE,
} from "@/lib/constants/economics";

export type BookingSplit = {
  total: number;
  operatorNet: number;
  /** BluePass's own platform-fee cut (5% referred / 10% unreferred) - not the partner's share. */
  commission: number;
  creatorShare: number;
  conservation: number;
  paymentProcessing: number;
  /** Real Stripe-rate estimate, informational only - distinct from the internal 3% payments line. */
  stripeEstimatedFee: number;
};

const roundCurrency = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function splitBooking(totalUsd: number, creatorAttributed = false): BookingSplit {
  if (!Number.isFinite(totalUsd) || totalUsd < 0) {
    throw new Error("Booking total must be a non-negative finite number.");
  }

  const conservation = totalUsd * CONSERVATION_PCT;
  const creatorShare = creatorAttributed ? totalUsd * PARTNER_COMMISSION_PCT : 0;
  const paymentProcessing = totalUsd * PAYMENT_PROCESSING_PCT;
  const commission = totalUsd * (creatorAttributed ? PLATFORM_FEE_PCT_REFERRED : PLATFORM_FEE_PCT_UNREFERRED);
  // Derived as the remainder (not a separate totalUsd * 0.82) so the four buckets always sum to
  // exactly totalUsd, with no rounding leakage between them.
  const operatorNet = totalUsd - conservation - creatorShare - paymentProcessing - commission;
  const stripeEstimatedFee = totalUsd * STRIPE_PERCENT_FEE + STRIPE_FIXED_FEE_USD;

  return {
    total: roundCurrency(totalUsd),
    operatorNet: roundCurrency(operatorNet),
    commission: roundCurrency(commission),
    creatorShare: roundCurrency(creatorShare),
    conservation: roundCurrency(conservation),
    paymentProcessing: roundCurrency(paymentProcessing),
    stripeEstimatedFee: roundCurrency(stripeEstimatedFee),
  };
}
