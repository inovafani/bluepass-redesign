import { NextRequest, NextResponse } from "next/server";
import { syncAllBokunCatalogs } from "@/lib/services/booking/adapters/bokun-sync";
import { recordCronRun } from "@/lib/services/monitoring/cron-run-log";

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.CRON_SECRET;

  if (expectedSecret) {
    const receivedSecret = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

    if (receivedSecret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
  }

  /* Wrapped so this job leaves a CronRunLog row like rezdy-agent-sync already does. Without it the
     admin payouts page can only report "never run" for bokun-sync, which is indistinguishable from
     "running fine but not logging" - the exact ambiguity that page exists to remove. recordCronRun
     re-throws, so a failing sync still surfaces as a 500 exactly as before. */
  const result = await recordCronRun("bokun-sync", () => syncAllBokunCatalogs());

  return NextResponse.json({ ok: true, ...result });
}
