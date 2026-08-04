import { NextRequest, NextResponse } from "next/server";
import { bokunAdapter, processBokunWebhook } from "@/lib/services/booking/adapters/bokun";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  if (!bokunAdapter.verifyWebhook(request.headers, rawBody)) {
    return NextResponse.json({ error: "Invalid Bokun webhook signature." }, { status: 401 });
  }

  const result = await processBokunWebhook(rawBody);

  return NextResponse.json(result);
}
