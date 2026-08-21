import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentTraveller } from "@/lib/services/auth/session";
import { listSavedTripSlugs, toggleSavedTrip } from "@/lib/services/account/saved-trips";

/**
 * Backs the shortlist heart on Discover. A signed-out visitor still gets the button working — the
 * client keeps its own optimistic state either way — this route is only where a signed-in
 * traveller's shortlist survives a reload or a new device. So GET returns an empty list rather than
 * 401 for a guest: "nothing saved yet" is the honest answer, not an error.
 */
export async function GET() {
  const traveller = await getCurrentTraveller();

  if (!traveller) {
    return NextResponse.json({ slugs: [] });
  }

  const slugs = await listSavedTripSlugs(traveller.accountId);
  return NextResponse.json({ slugs });
}

const toggleSchema = z.object({
  tripSlug: z.string().trim().min(1).max(200),
});

export async function POST(request: NextRequest) {
  const traveller = await getCurrentTraveller();

  if (!traveller) {
    return NextResponse.json({ error: "Please create or sign in to your BluePass account first." }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = toggleSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "tripSlug is required." }, { status: 400 });
  }

  const result = await toggleSavedTrip(traveller.accountId, parsed.data.tripSlug);
  return NextResponse.json(result);
}
