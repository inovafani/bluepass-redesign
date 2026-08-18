import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db/prisma";

/**
 * The gate on the two settings actions, tested at the action layer rather than the service layer.
 *
 * `payout-settings.test.ts` covers what the writes *do*; this file covers who is allowed to reach
 * them. Both actions decide which operator they are editing from the session alone — the profile id
 * is never accepted from the form — so the property worth pinning is that a session which no longer
 * resolves to an operator writes nothing at all.
 *
 * `next/cache` is stubbed because `revalidatePath` needs a request context these tests don't have,
 * and mocking the session module is what lets the action run without one.
 */
const EMAIL_PREFIX = "operator-settings-action-test+";

const { currentOperatorAccess } = vi.hoisted(() => ({ currentOperatorAccess: vi.fn() }));

vi.mock("@/lib/services/operator/guard", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./guard")>()),
  currentOperatorAccess,
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { updateCancellationPolicyAction, updatePayoutDetailsAction } = await import(
  "@/app/operator/actions"
);

afterAll(async () => {
  const accounts = await prisma.bluePassAccount.findMany({
    where: { email: { startsWith: EMAIL_PREFIX } },
    select: { id: true },
  });
  await prisma.bluePassAccount.deleteMany({ where: { id: { in: accounts.map((a) => a.id) } } });
});

beforeEach(() => {
  currentOperatorAccess.mockReset();
});

async function createOperator() {
  const email = `${EMAIL_PREFIX}${randomUUID()}@ops.bluepass.co`;
  const account = await prisma.bluePassAccount.create({
    data: {
      email,
      passwordHash: randomUUID(),
      emailVerifiedAt: new Date(),
      roles: ["OPERATOR"],
    },
    select: { id: true, email: true },
  });
  const profile = await prisma.operatorProfile.create({
    data: {
      accountId: account.id,
      status: "LIVE",
      companyName: `Settings Action Test ${randomUUID()}`,
      payoutContactEmail: email,
      payoutMethod: "MANUAL_BANK_TRANSFER",
    },
    select: { id: true },
  });
  return { accountId: account.id, email: account.email, profileId: profile.id };
}

function payoutForm(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return data;
}

function tierForm(rows: [string, string][]) {
  const data = new FormData();
  for (const [days, percent] of rows) {
    data.append("minDaysBeforeDeparture", days);
    data.append("refundPercent", percent);
  }
  return data;
}

describe("settings actions reject a session that is not an operator", () => {
  it.each([
    ["signed out", "SIGNED_OUT"],
    ["not an operator", "NOT_OPERATOR"],
    ["operator with no profile", "NO_PROFILE"],
  ])("refuses a payout change when %s", async (_label, reason) => {
    currentOperatorAccess.mockResolvedValue({ ok: false, reason });

    const state = await updatePayoutDetailsAction(
      { status: "idle" },
      payoutForm({ payoutMethod: "AIRWALLEX", airwallexReference: "X", confirm: "on" }),
    );

    expect(state.status).toBe("error");
  });

  it("refuses a cancellation-policy change when signed out", async () => {
    currentOperatorAccess.mockResolvedValue({ ok: false, reason: "SIGNED_OUT" });

    const state = await updateCancellationPolicyAction(
      { status: "idle" },
      tierForm([
        ["14", "100"],
        ["0", "0"],
      ]),
    );

    expect(state.status).toBe("error");
    if (state.status !== "error") return;
    expect(state.message).toMatch(/session has expired/i);
  });

  /**
   * The one that would matter if the profile id were ever taken from the form: a rejected session
   * must leave the database untouched, not merely return an error string.
   */
  it("writes nothing to the real profile when the session is rejected", async () => {
    const { profileId } = await createOperator();
    currentOperatorAccess.mockResolvedValue({ ok: false, reason: "NOT_OPERATOR" });

    await updateCancellationPolicyAction(
      { status: "idle" },
      tierForm([
        ["14", "100"],
        ["0", "0"],
      ]),
    );

    const profile = await prisma.operatorProfile.findUniqueOrThrow({
      where: { id: profileId },
      select: { cancellationPolicyTiers: true, payoutMethod: true },
    });

    expect(profile.cancellationPolicyTiers).toBeNull();
    expect(profile.payoutMethod).toBe("MANUAL_BANK_TRANSFER");
  });
});

describe("settings actions with a valid operator session", () => {
  it("requires the confirmation box before changing where money goes", async () => {
    const { accountId, email, profileId } = await createOperator();
    currentOperatorAccess.mockResolvedValue({
      ok: true,
      account: { id: accountId, email, displayName: null },
      profile: { id: profileId },
    });

    const state = await updatePayoutDetailsAction(
      { status: "idle" },
      // Deliberately no `confirm` — the UI disables the button, this proves the server agrees.
      payoutForm({ payoutMethod: "AIRWALLEX", airwallexReference: "BENE-1" }),
    );

    expect(state.status).toBe("error");
    if (state.status !== "error") return;
    expect(state.message).toMatch(/confirm/i);

    const profile = await prisma.operatorProfile.findUniqueOrThrow({
      where: { id: profileId },
      select: { payoutMethod: true },
    });
    expect(profile.payoutMethod).toBe("MANUAL_BANK_TRANSFER");
  });

  it("saves a confirmed payout change for the session's own profile", async () => {
    const { accountId, email, profileId } = await createOperator();
    currentOperatorAccess.mockResolvedValue({
      ok: true,
      account: { id: accountId, email, displayName: null },
      profile: { id: profileId },
    });

    const state = await updatePayoutDetailsAction(
      { status: "idle" },
      payoutForm({ payoutMethod: "AIRWALLEX", airwallexReference: "BENE-2", confirm: "on" }),
    );

    expect(state.status).toBe("done");

    const profile = await prisma.operatorProfile.findUniqueOrThrow({
      where: { id: profileId },
      select: { payoutMethod: true, notes: true },
    });
    expect(profile.payoutMethod).toBe("AIRWALLEX");
    expect(profile.notes).toContain(`Payout details updated by ${email}`);
  });

  /**
   * A second operator exists throughout, and never changes. The action takes no profile id, so
   * there is no parameter to tamper with — this asserts the consequence of that design.
   */
  it("edits only the signed-in operator's profile, never a neighbour's", async () => {
    const mine = await createOperator();
    const theirs = await createOperator();

    currentOperatorAccess.mockResolvedValue({
      ok: true,
      account: { id: mine.accountId, email: mine.email, displayName: null },
      profile: { id: mine.profileId },
    });

    const state = await updateCancellationPolicyAction(
      { status: "idle" },
      tierForm([
        ["21", "100"],
        ["0", "0"],
      ]),
    );

    expect(state.status).toBe("done");

    const neighbour = await prisma.operatorProfile.findUniqueOrThrow({
      where: { id: theirs.profileId },
      select: { cancellationPolicyTiers: true },
    });
    expect(neighbour.cancellationPolicyTiers).toBeNull();

    const own = await prisma.operatorProfile.findUniqueOrThrow({
      where: { id: mine.profileId },
      select: { cancellationPolicyTiers: true },
    });
    expect(own.cancellationPolicyTiers).toEqual([
      { minDaysBeforeDeparture: 21, refundPercent: 100 },
      { minDaysBeforeDeparture: 0, refundPercent: 0 },
    ]);
  });

  it("reports a malformed tier back instead of saving it", async () => {
    const { accountId, email, profileId } = await createOperator();
    currentOperatorAccess.mockResolvedValue({
      ok: true,
      account: { id: accountId, email, displayName: null },
      profile: { id: profileId },
    });

    // A blank row: Number("") would be 0, which must not become a real "0 days, 0%" tier.
    const state = await updateCancellationPolicyAction(
      { status: "idle" },
      tierForm([
        ["14", "100"],
        ["", ""],
      ]),
    );

    expect(state.status).toBe("error");

    const profile = await prisma.operatorProfile.findUniqueOrThrow({
      where: { id: profileId },
      select: { cancellationPolicyTiers: true },
    });
    expect(profile.cancellationPolicyTiers).toBeNull();
  });
});
