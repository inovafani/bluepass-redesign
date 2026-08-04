import { NextRequest, NextResponse } from "next/server";
import { createTravellerSession } from "@/lib/services/auth/session";
import {
  isSafeNextPath,
  verifyTravellerEmail,
} from "@/lib/services/auth/email-verification";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const token = requestUrl.searchParams.get("token")?.trim();
  const nextPath = requestUrl.searchParams.get("next");

  if (!token) {
    return redirectToLogin(request, "missing-token");
  }

  const result = await verifyTravellerEmail(token);

  if (!result.ok) {
    return redirectToLogin(request, "invalid-token");
  }

  await createTravellerSession(result.accountId);

  const redirectPath =
    nextPath && isSafeNextPath(nextPath)
      ? nextPath
      : "/discover?emailVerified=1";

  return NextResponse.redirect(new URL(redirectPath, request.url));
}

function redirectToLogin(request: NextRequest, reason: string) {
  return NextResponse.redirect(
    new URL(`/login?verification=${reason}`, request.url),
  );
}
