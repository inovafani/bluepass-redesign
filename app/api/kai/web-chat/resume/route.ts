import { NextResponse } from "next/server";
import { getCurrentTraveller } from "@/lib/services/auth/session";
import { resumeKaiCoreSession, shouldUseKaiCore } from "@/lib/services/kai-core/client";

export async function POST() {
  if (!shouldUseKaiCore()) {
    return NextResponse.json({ resumed: false });
  }

  const traveller = await getCurrentTravellerSafely();

  if (!traveller) {
    return NextResponse.json({ resumed: false });
  }

  try {
    const session = await resumeKaiCoreSession({ travellerAccountId: traveller.accountId });

    if (!session) {
      // No existing conversation for this account in any tenant yet - the normal first-message
      // flow will tag a fresh conversation to the account as soon as a region is known.
      return NextResponse.json({ resumed: false });
    }

    return NextResponse.json({
      resumed: session.resumed,
      sessionId: session.conversationId,
      region: session.region,
      messages: session.messages,
    });
  } catch (error) {
    console.warn("kai.web_chat.resume_failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : "Unable to resume Kai session",
    });

    return NextResponse.json({ resumed: false });
  }
}

async function getCurrentTravellerSafely() {
  try {
    return await getCurrentTraveller();
  } catch (error) {
    if (error instanceof Error && error.message.includes("outside a request scope")) {
      return undefined;
    }

    throw error;
  }
}
