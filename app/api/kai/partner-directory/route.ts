import { NextRequest, NextResponse } from "next/server";
import { listApprovedPartnerDirectory } from "@/lib/services/partners/partner-directory";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!isAuthorizedKaiBridgeRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const partners = await listApprovedPartnerDirectory();

  return NextResponse.json({
    partners,
  });
}

function isAuthorizedKaiBridgeRequest(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return false;

  const allowedTokens = [process.env.KAI_CORE_ADMIN_TOKEN, process.env.BLUEPASS_SERVICE_TOKEN]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  return allowedTokens.includes(token);
}
