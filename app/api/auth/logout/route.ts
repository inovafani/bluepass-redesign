import { NextResponse } from "next/server";
import { clearTravellerSession } from "@/lib/services/auth/session";

export async function POST() {
  await clearTravellerSession();

  return NextResponse.json({ ok: true });
}
