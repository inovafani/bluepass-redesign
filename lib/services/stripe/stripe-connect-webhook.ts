import Stripe from "stripe";
import { prisma } from "@/lib/db/prisma";

export type StripeConnectWebhookEnv = Record<string, string | undefined>;

/**
 * Verifies a webhook delivered to bluepass-app's own account.updated endpoint - a separate Stripe
 * webhook endpoint (own signing secret) registered on the same BluePass Stripe account that kai's
 * payment webhook also listens on, scoped to just account.updated events. bluepass-app never holds
 * BluePass's own Stripe secret key (that lives in kai, which creates checkouts/accounts/transfers on
 * bluepass-app's behalf); constructEvent's signature check only uses the webhook secret + raw body +
 * signature header, never the constructor's key, so a placeholder string is fine here.
 */
export function verifyStripeConnectWebhookEvent(
  rawBody: string,
  signature: string,
  env: StripeConnectWebhookEnv = process.env,
): Stripe.Event {
  const webhookSecret = env.STRIPE_CONNECT_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    throw new Error("STRIPE_CONNECT_WEBHOOK_SECRET is not configured.");
  }

  const stripe = new Stripe("bluepass_app_never_calls_the_stripe_api");
  return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
}

export async function handleStripeAccountUpdated(account: Stripe.Account) {
  const profile = await prisma.operatorProfile.findUnique({
    where: { stripeConnectAccountId: account.id },
  });

  if (!profile) {
    console.warn("stripe_connect_webhook.unknown_account", { accountId: account.id });
    return;
  }

  const chargesEnabled = Boolean(account.charges_enabled);
  const payoutsEnabled = Boolean(account.payouts_enabled);

  await prisma.operatorProfile.update({
    where: { id: profile.id },
    data: {
      stripeChargesEnabled: chargesEnabled,
      stripePayoutsEnabled: payoutsEnabled,
      ...(chargesEnabled && payoutsEnabled && !profile.stripeOnboardedAt
        ? { stripeOnboardedAt: new Date() }
        : {}),
    },
  });
}
