import { NextRequest, NextResponse } from "next/server";
import { recordCronRun } from "@/lib/services/monitoring/cron-run-log";
import { runRezdyAgentDiscoverSync } from "@/lib/services/discover/rezdy-agent-sync";

async function handleSyncRequest(request: NextRequest) {
  const expectedSecret = process.env.CRON_SECRET;

  if (expectedSecret) {
    const receivedSecret = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

    if (receivedSecret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
  }

  // Milestone 3.5: recordCronRun persists this run's outcome (see lib/services/monitoring) so a
  // silently-stopped or failing sync leaves a queryable trail instead of Discover just going stale.
  const result = await recordCronRun("rezdy-agent-sync", () => runRezdyAgentDiscoverSync());

  return NextResponse.json({ ok: true, ...result });
}

// Vercel's native Cron Jobs send a GET request (see vercel.json's crons entry for this path) -
// POST is kept too so this can also be triggered manually/by an external scheduler, same dual
// support pattern this repo already leaves open for /api/cron/bokun-sync.
export async function GET(request: NextRequest) {
  return handleSyncRequest(request);
}

export async function POST(request: NextRequest) {
  return handleSyncRequest(request);
}
