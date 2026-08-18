import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { sendOperatorLoginInvite } from "./operator-login-invite";

/**
 * Real rows behind the usual prefix, with the mail send injected — the default would put a live
 * password-setting link in a real inbox, which is not something a test suite should be able to do
 * by running.
 *
 * The gating case is the one that matters most here and is a separate `describe` below: this action
 * emails a working account-takeover link, so "only an admin can fire it" is a property worth a test
 * rather than a code-review observation.
 */
const EMAIL_PREFIX = "operator-invite-test+";

/* Hoisted so the module factory below can see it — vi.mock is lifted above the imports. */
const { requireCurrentAdmin } = vi.hoisted(() => ({ requireCurrentAdmin: vi.fn() }));

vi.mock("@/lib/services/auth/admin", () => ({ requireCurrentAdmin }));

afterAll(async () => {
  const accounts = await prisma.bluePassAccount.findMany({
    where: { email: { startsWith: EMAIL_PREFIX } },
    select: { id: true },
  });
  await prisma.bluePassAccount.deleteMany({ where: { id: { in: accounts.map((a) => a.id) } } });
});

beforeEach(() => {
  requireCurrentAdmin.mockReset();
});

function fakeReset() {
  return vi.fn(async (input: { email: string }) => ({
    requested: true as const,
    delivery: { delivered: false as const, provider: "development" as const, reason: "test" },
    developmentResetUrl: `https://test.invalid/reset-password?token=for-${input.email}`,
  }));
}

async function operator(overrides: { payoutContactEmail?: string | null } = {}) {
  const accountEmail = `${EMAIL_PREFIX}${randomUUID()}@ops.bluepass.co`;

  const profile = await prisma.operatorProfile.create({
    data: {
      status: "LIVE",
      companyName: `Invite Test ${randomUUID()}`,
      payoutContactEmail:
        overrides.payoutContactEmail === undefined
          ? `${EMAIL_PREFIX}payout-${randomUUID()}@ops.bluepass.co`
          : overrides.payoutContactEmail,
      account: {
        create: { email: accountEmail, passwordHash: "unusable-placeholder", roles: ["OPERATOR"] },
      },
    },
    select: { id: true, payoutContactEmail: true },
  });

  return { ...profile, accountEmail };
}

describe("sendOperatorLoginInvite", () => {
  it("sends to the payout contact email recorded on the profile", async () => {
    const profile = await operator();
    const createReset = fakeReset();

    const result = await sendOperatorLoginInvite({ operatorProfileId: profile.id }, createReset);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.email).toBe(profile.payoutContactEmail);
    expect(createReset).toHaveBeenCalledWith({
      email: profile.payoutContactEmail,
      baseUrl: undefined,
    });
    /* Surfaced so the flow is completable on a laptop with no mail provider configured. */
    expect(result.developmentResetUrl).toContain("/reset-password?token=");
  });

  it("falls back to the account's own email when the profile has no payout contact", async () => {
    /* Profiles the Rezdy sync created have a null payoutContactEmail, and the account email is the
       address a reset token would actually be checked against. */
    const profile = await operator({ payoutContactEmail: null });
    const createReset = fakeReset();

    const result = await sendOperatorLoginInvite({ operatorProfileId: profile.id }, createReset);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.email).toBe(profile.accountEmail);
  });

  it("refuses a profile that no longer exists rather than mailing anyone", async () => {
    const createReset = fakeReset();

    const result = await sendOperatorLoginInvite(
      { operatorProfileId: `missing-${randomUUID()}` },
      createReset,
    );

    expect(result.ok).toBe(false);
    expect(createReset).not.toHaveBeenCalled();
  });
});

describe("sendOperatorLoginInviteAction", () => {
  /* Imported lazily so the vi.mock above is in place before the action module resolves its own
     import of requireCurrentAdmin. */
  async function action() {
    const module = await import("@/app/admin/operators/actions");
    return module.sendOperatorLoginInviteAction;
  }

  function formData(operatorProfileId: string) {
    const data = new FormData();
    data.set("operatorProfileId", operatorProfileId);
    return data;
  }

  it("refuses to send when the caller is not an admin", async () => {
    requireCurrentAdmin.mockResolvedValue(undefined);
    const profile = await operator();
    const send = await action();

    const state = await send({ status: "idle" }, formData(profile.id));

    expect(state.status).toBe("error");
    /* The gate has to stop it before any token exists — an invite link minted and then not
       reported would still be a live way into the account. */
    const tokens = await prisma.bluePassAccountPasswordResetToken.count({
      where: { account: { email: profile.payoutContactEmail ?? profile.accountEmail } },
    });
    expect(tokens).toBe(0);
  });

  it("passes an admin through to the invite itself", async () => {
    requireCurrentAdmin.mockResolvedValue({
      id: "adm_1",
      email: "operator-invite-test-reviewer@bluepass.co",
      roles: ["ADMIN"],
      displayName: "Reviewer",
    });
    const send = await action();

    /* Deliberately a profile id that does not exist: it proves the call reached
       `sendOperatorLoginInvite` — only that function can produce this message — without the real
       mail path running against a real address. */
    const state = await send({ status: "idle" }, formData(`missing-${randomUUID()}`));

    expect(state.status).toBe("error");
    if (state.status !== "error") return;
    expect(state.message).toContain("no longer exists");
  });
});
