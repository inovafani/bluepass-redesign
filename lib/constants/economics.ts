// The real, tested split - Tony's own "Economics stated by the playbooks (source of truth)"
// (kai-persona-triage.md) and its test-guard in kai-refinement-loop.md ("82% / 18% (5/5/3/5); never
// invent commission %") - mirrored from kai's src/core/bluepass/ledger.ts so both repos' commission
// math never drift apart again. Conservation and payment processing always apply; the partner/
// creator share only applies when a referral is attached, in which case BluePass's own platform fee
// is smaller (5% vs 10%) so the operator's 82% net never depends on whether a referral happened to
// be attached. No dollar cap.
export const CONSERVATION_PCT = 0.05;
export const PARTNER_COMMISSION_PCT = 0.05;
export const PAYMENT_PROCESSING_PCT = 0.03;
export const PLATFORM_FEE_PCT_REFERRED = 0.05;
export const PLATFORM_FEE_PCT_UNREFERRED = 0.1;
export const STRIPE_PERCENT_FEE = 0.029;
export const STRIPE_FIXED_FEE_USD = 0.3;
