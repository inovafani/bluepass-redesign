import { NextRequest, NextResponse } from "next/server";
import { resolveOperatorPayoutAccount } from "@/lib/services/operators/operator-payout-account";

/**
 * Service-to-service endpoint: Kai's payout-release code calls this to resolve a Stripe Connect
 * account for a tenant. See lib/services/operators/operator-payout-account.ts for the real logic and
 * why the join key is kaiTenantSlug, not claimedOperatorSlug.
 *
 * Auth follows this repo's existing INTERNAL_SERVICE_TOKEN convention (see
 * app/api/whatsapp/send/route.ts, app/api/kai/web-chat/inquiry/dispatch/route.ts), not a new secret.
 */
export async function GET(request: NextRequest) {
  const serviceToken = request.headers.get("authorization")?.replace("Bearer ", "");

  if (!process.env.INTERNAL_SERVICE_TOKEN || serviceToken !== process.env.INTERNAL_SERVICE_TOKEN) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const tenantSlug = request.nextUrl.searchParams.get("tenantSlug")?.trim();
  if (!tenantSlug) {
    return NextResponse.json({ error: "tenantSlug query parameter is required." }, { status: 400 });
  }

  const account = await resolveOperatorPayoutAccount(tenantSlug);
  return NextResponse.json(account);
}
