import { NextRequest, NextResponse } from "next/server";
import { getCurrentTraveller } from "@/lib/services/auth/session";
import {
  createOperatorClaimForAccount,
  operatorClaimSchema,
} from "@/lib/services/operators/operator-claim-service";

export async function POST(request: NextRequest) {
  const body: unknown = await request.json();
  const parsed = operatorClaimSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please check the claim form fields and try again." },
      { status: 400 },
    );
  }

  const currentTraveller = await getCurrentTraveller();

  if (!currentTraveller?.accountId) {
    return NextResponse.json(
      { error: "Please create or sign in to your BluePass account first." },
      { status: 401 },
    );
  }

  if (parsed.data.authorized !== true) {
    return NextResponse.json(
      { error: "Please confirm you are authorized to claim this business." },
      { status: 400 },
    );
  }

  try {
    const claim = await createOperatorClaimForAccount({
      ...parsed.data,
      accountId: currentTraveller.accountId,
    });

    return NextResponse.json({ ok: true, claim });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to submit this claim right now.",
      },
      { status: 400 },
    );
  }
}
