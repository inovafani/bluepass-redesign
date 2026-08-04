import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { confirmKaiCorePayment } from "@/lib/services/kai-core/client";

const paymentConfirmRequestSchema = z.object({
  conversationId: z.string().trim().min(1),
  cardToken: z.string().trim().min(1),
  region: z.enum(["indonesia", "australia"]).optional(),
});

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = paymentConfirmRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "conversationId and cardToken are required." }, { status: 400 });
  }

  try {
    const confirmation = await confirmKaiCorePayment({
      conversationId: parsed.data.conversationId,
      cardToken: parsed.data.cardToken,
      region: parsed.data.region,
    });

    return NextResponse.json(confirmation);
  } catch (error) {
    console.warn("kai.web_chat.payment_confirm_failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : "Unable to confirm secure payment",
    });

    return NextResponse.json({ error: "Payment could not be confirmed." }, { status: 502 });
  }
}
