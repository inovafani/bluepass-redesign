import { prisma } from "@/lib/db/prisma";

/**
 * Milestone 3.5 (BOOKING_INTEGRATION_PLAN.md's "per-platform monitoring: availability freshness,
 * booking-write failures, cancellations sync") - wraps a cron job's run function so every execution
 * leaves a queryable CronRunLog row, success or failure. Logging itself is best-effort: a write
 * failure here is logged to the console but never turns an already-succeeded (or already-failed) run
 * into something different than what actually happened.
 */
export async function recordCronRun<T>(jobName: string, run: () => Promise<T>): Promise<T> {
  const startedAt = new Date();

  try {
    const result = await run();
    await prisma.cronRunLog
      .create({
        data: { jobName, status: "SUCCESS", summary: result as object, startedAt, finishedAt: new Date() },
      })
      .catch((error) => console.error("cron_run_log.write_failed", { jobName, error }));
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await prisma.cronRunLog
      .create({ data: { jobName, status: "FAILURE", errorMessage, startedAt, finishedAt: new Date() } })
      .catch((logError) => console.error("cron_run_log.write_failed", { jobName, logError }));
    throw error;
  }
}

export async function listCronRuns(input: { jobName?: string; limit?: number } = {}) {
  const limit = input.limit && input.limit > 0 ? Math.min(input.limit, 100) : 20;

  return prisma.cronRunLog.findMany({
    where: input.jobName ? { jobName: input.jobName } : undefined,
    orderBy: { finishedAt: "desc" },
    take: limit,
  });
}
