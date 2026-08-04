import { NextRequest, NextResponse } from "next/server";
import { syncAllBokunCatalogs } from "@/lib/services/booking/adapters/bokun-sync";

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.CRON_SECRET;

  if (expectedSecret) {
    const receivedSecret = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

    if (receivedSecret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
  }

  const result = await syncAllBokunCatalogs();

  return NextResponse.json({ ok: true, ...result });
}
