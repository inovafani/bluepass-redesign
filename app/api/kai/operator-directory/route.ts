import { NextRequest, NextResponse } from "next/server";
import { listApprovedOperatorDirectory } from "@/lib/services/operators/operator-directory";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!isAuthorizedKaiBridgeRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const operators = await listApprovedOperatorDirectory().catch((error) => {
    console.error("kai.operator_directory_failed", error);

    return [];
  });

  return NextResponse.json({
    operators,
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
