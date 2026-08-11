import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { listCronRuns, recordCronRun } from "./cron-run-log";

describe("recordCronRun", () => {
  afterEach(async () => {
    await prisma.cronRunLog.deleteMany({ where: { jobName: { startsWith: "test-job-" } } });
  });

  it("records a SUCCESS run and returns the wrapped function's result unchanged", async () => {
    const jobName = `test-job-${randomUUID()}`;

    const result = await recordCronRun(jobName, async () => ({ productsSeen: 5, listingsCreated: 2 }));

    expect(result).toEqual({ productsSeen: 5, listingsCreated: 2 });
    const runs = await prisma.cronRunLog.findMany({ where: { jobName } });
    expect(runs).toHaveLength(1);
    expect(runs[0].status).toBe("SUCCESS");
    expect(runs[0].summary).toEqual({ productsSeen: 5, listingsCreated: 2 });
  });

  it("records a FAILURE run and rethrows the original error unchanged", async () => {
    const jobName = `test-job-${randomUUID()}`;

    await expect(
      recordCronRun(jobName, async () => {
        throw new Error("Rezdy API is down");
      }),
    ).rejects.toThrow("Rezdy API is down");

    const runs = await prisma.cronRunLog.findMany({ where: { jobName } });
    expect(runs).toHaveLength(1);
    expect(runs[0].status).toBe("FAILURE");
    expect(runs[0].errorMessage).toBe("Rezdy API is down");
  });
});

describe("listCronRuns", () => {
  afterEach(async () => {
    await prisma.cronRunLog.deleteMany({ where: { jobName: { startsWith: "test-job-" } } });
  });

  it("lists recent runs, most recent first, optionally filtered by jobName", async () => {
    const jobName = `test-job-${randomUUID()}`;
    const older = await prisma.cronRunLog.create({
      data: {
        jobName,
        status: "SUCCESS",
        startedAt: new Date(Date.now() - 60_000),
        finishedAt: new Date(Date.now() - 55_000),
      },
    });
    const newer = await prisma.cronRunLog.create({
      data: { jobName, status: "FAILURE", errorMessage: "boom", startedAt: new Date(), finishedAt: new Date() },
    });

    const runs = await listCronRuns({ jobName });

    expect(runs.map((r) => r.id)).toEqual([newer.id, older.id]);
  });

  it("caps the limit at 100 and defaults to 20", async () => {
    const runs = await listCronRuns({ limit: 99999 });
    expect(runs.length).toBeLessThanOrEqual(100);

    const defaultRuns = await listCronRuns({});
    expect(defaultRuns.length).toBeLessThanOrEqual(20);
  });
});
