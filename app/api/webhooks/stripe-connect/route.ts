import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { handleStripeAccountUpdated, verifyStripeConnectWebhookEvent } from "@/lib/services/stripe/stripe-connect-webhook";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  // Raw text, not .json() - Stripe's signature check is over the exact request bytes.
  const rawBody = await request.text();

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe-Signature header." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = verifyStripeConnectWebhookEvent(rawBody, signature);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Stripe webhook signature verification failed." },
      { status: 400 },
    );
  }

  // Always ack with 200 once the signature is verified - one handler failure should not make Stripe
  // retry-storm the whole event; failures are logged and surfaced in the response body instead.
  const failures: string[] = [];

  try {
    if (event.type === "account.updated") {
      await handleStripeAccountUpdated(event.data.object as Stripe.Account);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failures.push(message);
    console.error("stripe_connect_webhook.handler_failed", { eventType: event.type, error: message });
  }

  return NextResponse.json({ received: true, ...(failures.length > 0 ? { failures } : {}) });
}
