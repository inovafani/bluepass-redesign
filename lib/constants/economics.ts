// The real split, confirmed against Bluepass's own pitch deck ("We charge a 20% commission... we
// keep ~12% of every booking" - the unreferred case: 5% reef + 3% payments + 12% BluePass net = 20%)
// - mirrored from kai's src/core/bluepass/ledger.ts so both repos' commission math never drift apart
// again. Conservation and payment processing always apply; the partner share only applies
// when a referral is attached, in which case BluePass's own platform fee is smaller so the
// operator's net share never depends on whether a referral happened to be attached. No dollar cap.
//
// One flat rate for every market as of 2026-08-24: Australia moved to 20%/80% on 2026-08-05,
// Indonesia was corrected to the same split on 2026-08-24 ("Indonesia ternyata 20% juga, bukan
// 18%"), and Kai's mirrored ledger.ts folded in Boattime the same day too - a code comment had
// claimed Boattime needed to stay frozen on an old 18%/82% figure, but that claim had no real,
// checkable source (the docs it cited don't exist in this workspace, and the real pitch deck has
// said 20% all along). See ledger.ts's BluePassLedgerSplitInput.market comment for the full history.
// The *_PCT and AU_*_PCT constants below are now identical - kept as two names rather than collapsed
// to one only so a real future region-specific split doesn't require re-adding the distinction.
export const CONSERVATION_PCT = 0.05;
export const PARTNER_COMMISSION_PCT = 0.05;
export const PAYMENT_PROCESSING_PCT = 0.03;
export const PLATFORM_FEE_PCT_REFERRED = 0.07;
export const PLATFORM_FEE_PCT_UNREFERRED = 0.12;
export const AU_PLATFORM_FEE_PCT_REFERRED = 0.07;
export const AU_PLATFORM_FEE_PCT_UNREFERRED = 0.12;
export const STRIPE_PERCENT_FEE = 0.029;
export const STRIPE_FIXED_FEE_USD = 0.3;
