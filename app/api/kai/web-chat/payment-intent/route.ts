import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createKaiCorePaymentIntent } from "@/lib/services/kai-core/client";

const paymentIntentRequestSchema = z.object({
  conversationId: z.string().trim().min(1),
  region: z.enum(["indonesia", "australia"]).optional(),
});

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = paymentIntentRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "conversationId is required." }, { status: 400 });
  }

  try {
    const intent = await createKaiCorePaymentIntent({
      conversationId: parsed.data.conversationId,
      region: parsed.data.region,
    });

    return NextResponse.json(intent);
  } catch (error) {
    console.warn("kai.web_chat.payment_intent_failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : "Unable to start secure payment",
    });

    return NextResponse.json({ error: "Secure payment is not available right now." }, { status: 502 });
  }
}
