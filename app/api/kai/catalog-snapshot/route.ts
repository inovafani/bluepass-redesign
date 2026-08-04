import { NextResponse } from "next/server";
import { buildBluePassCatalogSnapshot } from "@/lib/services/kai-core/client";

// Public, read-only: the same merged catalog (static yachts + LIVE operator listings) the
// web-widget path already sends inline with every chat message. WhatsApp messages hit kai
// directly and never go through this app's web-widget client, so kai's WhatsApp path pulls this
// same snapshot from here instead - keeps both channels seeing identical, real catalog data.
export async function GET() {
  const catalog = await buildBluePassCatalogSnapshot();

  return NextResponse.json({ catalog });
}
