import { prisma } from "@/lib/db/prisma";
import { OperatorPayoutMethod } from "@prisma/client";

export type CancellationPolicyTier = { minDaysBeforeDeparture: number; refundPercent: number };

export type OperatorPayoutAccount = {
  stripeConnectAccountId: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  /**
   * Null when the operator hasn't set their own cancellation policy yet (no onboarding UI collects
   * this today) - Kai's auto-refund calculator (src/core/cancellation/rules.ts) falls back to its
   * own clearly-labeled platform default in that case, never invents this operator's real terms.
   */
  cancellationPolicyTiers: CancellationPolicyTier[] | null;
  /**
   * Milestone 2.5: which payout rail this operator uses - STRIPE_CONNECT (AU, real, live) or
   * AIRWALLEX (Indonesia - Kai's adapter is shape-only, no real account exists yet) or
   * MANUAL_BANK_TRANSFER (the default/fallback, unrelated to a specific rail). Kai branches on this
   * to pick which release path to call; see settlePmsBookingPaymentAttempt/
   * cancelPmsBookingPaymentAttempt in bluepass-pms-stripe.ts.
   */
  payoutMethod: OperatorPayoutMethod;
};

/**
 * Resolves the Stripe Connect payout account (and cancellation policy) for a Kai tenant (e.g.
 * "boattime"), so Kai's direct-PMS/Rezdy payout-release and auto-refund code can look these up
 * automatically instead of an admin pasting them in by hand every time. Kai has no operator model of
 * its own - both fields only exist on this app's OperatorProfile (stripeConnectAccountId populated by
 * the real account.updated webhook at /api/webhooks/stripe-connect).
 *
 * Join key is OperatorProfile.kaiTenantSlug, a field added specifically for this - NOT
 * claimedOperatorSlug, which is this app's own legacy Operator table's slug namespace and was never
 * designed to match Kai's Tenant.slug values. Returns all-null/false (not an error) when no profile
 * is linked yet - the caller should treat that as "fall back to manual payout," not throw.
 */
export async function resolveOperatorPayoutAccount(tenantSlug: string): Promise<OperatorPayoutAccount> {
  const profile = await prisma.operatorProfile.findUnique({
    where: { kaiTenantSlug: tenantSlug },
    select: {
      stripeConnectAccountId: true,
      stripeChargesEnabled: true,
      stripePayoutsEnabled: true,
      cancellationPolicyTiers: true,
      payoutMethod: true,
    },
  });

  return {
    stripeConnectAccountId: profile?.stripeConnectAccountId ?? null,
    chargesEnabled: profile?.stripeChargesEnabled ?? false,
    payoutsEnabled: profile?.stripePayoutsEnabled ?? false,
    cancellationPolicyTiers: (profile?.cancellationPolicyTiers as CancellationPolicyTier[] | null) ?? null,
    payoutMethod: profile?.payoutMethod ?? OperatorPayoutMethod.MANUAL_BANK_TRANSFER,
  };
}
