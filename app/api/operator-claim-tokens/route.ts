import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requestOperatorClaimToken } from "@/lib/services/operators/operator-claim-tokens";

const requestSchema = z.object({
  operatorSlug: z.string().trim().min(1).max(140),
});

export async function POST(request: NextRequest) {
  const body: unknown = await request.json();
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please check the operator claim link request." },
      { status: 400 },
    );
  }

  try {
    const result = await requestOperatorClaimToken({
      operatorSlug: parsed.data.operatorSlug,
      baseUrl: request.nextUrl.origin,
    });

    if (!result.ok && result.reason === "missing_email") {
      return NextResponse.json(
        {
          ok: false,
          reason: "missing_email",
          message:
            "We do not have a verified business email for this listing yet. BluePass will review it manually.",
        },
        { status: 202 },
      );
    }

    if (!result.ok && result.reason === "send_failed") {
      return NextResponse.json(
        {
          ok: false,
          reason: "send_failed",
          message: "The claim link email could not be sent right now. Please try again shortly.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      developmentClaimUrl:
        process.env.NODE_ENV === "production" ? undefined : result.claimUrl,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to send the claim link right now.",
      },
      { status: 400 },
    );
  }
}
