import { NextRequest, NextResponse } from "next/server";
import { listCronRuns } from "@/lib/services/monitoring/cron-run-log";

/**
 * Milestone 3.5 (BOOKING_INTEGRATION_PLAN.md's "per-platform monitoring") - lets ops check whether
 * the rezdy-agent-sync cron is actually running/succeeding instead of only noticing when Discover
 * has gone stale. Same INTERNAL_SERVICE_TOKEN bearer-auth convention as the other /api/internal/*
 * endpoints (e.g. operator-payout-account) - not a new secret, and the same trust boundary: whoever
 * holds this token can already read operator payout/cancellation-policy data, so also letting them
 * read cron health here is a consistent widening, not a new exposure.
 */
export async function GET(request: NextRequest) {
  const serviceToken = request.headers.get("authorization")?.replace("Bearer ", "");

  if (!process.env.INTERNAL_SERVICE_TOKEN || serviceToken !== process.env.INTERNAL_SERVICE_TOKEN) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const jobName = request.nextUrl.searchParams.get("jobName")?.trim() || undefined;
  const limitParam = Number(request.nextUrl.searchParams.get("limit"));
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : undefined;

  const runs = await listCronRuns({ jobName, limit });

  return NextResponse.json({ runs });
}
