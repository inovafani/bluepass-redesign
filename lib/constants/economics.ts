// The real split, confirmed against Bluepass's own pitch deck ("We charge a 20% commission... we
// keep ~12% of every booking" - the unreferred case: 5% reef + 3% payments + 12% BluePass net = 20%)
// - mirrored from kai's src/core/bluepass/ledger.ts so both repos' commission math never drift apart
// again. Conservation and payment processing always apply; the partner share only applies
// when a referral is attached, in which case BluePass's own platform fee is smaller so the
// operator's net share never depends on whether a referral happened to be attached. No dollar cap.
//
// Market rates. Australia is 20%/80% (since 2026-08-05); Indonesia was set to the same on 2026-08-24
// ("Indonesia ternyata 20% juga, bukan 18%"). On 2026-11-10 Tony (the founder) said it is 20% for
// Australia and 18% for Indonesia and Barbados - named markets only, never a blanket rate - so those
// two take a lower platform fee (5% referred / 10% unreferred); conservation stays 5% and the operator
// keeps 82%. A booking carries no market of its own yet, so `marketForCurrency` reads it from an
// unambiguous currency (AUD, IDR, BBD); anything else, including USD, keeps the 20% default.
// Mirrored in Kai's src/core/bluepass/ledger.ts - change both together.
export const CONSERVATION_PCT = 0.05;
export const PARTNER_COMMISSION_PCT = 0.05;
export const PAYMENT_PROCESSING_PCT = 0.03;
export const PLATFORM_FEE_PCT_REFERRED = 0.07;
export const PLATFORM_FEE_PCT_UNREFERRED = 0.12;
export const AU_PLATFORM_FEE_PCT_REFERRED = 0.07;
export const AU_PLATFORM_FEE_PCT_UNREFERRED = 0.12;
export const STRIPE_PERCENT_FEE = 0.029;
export const STRIPE_FIXED_FEE_USD = 0.3;

export type BookingMarket = "AUSTRALIA" | "INDONESIA" | "BARBADOS";

export const PLATFORM_FEE_PCT: Record<BookingMarket, { referred: number; unreferred: number }> = {
  AUSTRALIA: { referred: AU_PLATFORM_FEE_PCT_REFERRED, unreferred: AU_PLATFORM_FEE_PCT_UNREFERRED },
  INDONESIA: { referred: 0.05, unreferred: 0.1 },
  BARBADOS: { referred: 0.05, unreferred: 0.1 },
};

/** The market a booking is in when its currency says so unambiguously; undefined otherwise. */
export function marketForCurrency(currency?: string | null): BookingMarket | undefined {
  switch (currency?.toUpperCase()) {
    case "AUD": return "AUSTRALIA";
    case "IDR": return "INDONESIA";
    case "BBD": return "BARBADOS";
    default: return undefined;
  }
}
