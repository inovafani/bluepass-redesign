import { beforeEach, describe, expect, it, vi } from "vitest";

const upsert = vi.fn(async (args: unknown) => args);
vi.mock("@/lib/db/prisma", () => ({ prisma: { outreachSuppression: { upsert: (args: unknown) => upsert(args) } } }));

import { HOLD_REASON, holdOutreach, outreachHoldQuery } from "./outreach-hold";

beforeEach(() => upsert.mockClear());

describe("outreach hold", () => {
  it("holds the lower-cased address and never overwrites an existing reason", async () => {
    await outreachHoldQuery("  Info@Rum-Runner.com.au ", "hold-import");
    expect(upsert).toHaveBeenCalledWith({
      where: { email: "info@rum-runner.com.au" },
      create: { email: "info@rum-runner.com.au", reason: HOLD_REASON, source: "hold-import" },
      update: {},
    });
  });

  it("does nothing for a lead with no email", async () => {
    await holdOutreach(null, "hold-import");
    await holdOutreach("   ", "hold-import");
    expect(upsert).not.toHaveBeenCalled();
  });
});
