import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { resolveOperatorAccess } from "./guard";

/**
 * Same convention as operator-onboarding.test.ts: real rows against the shared dev database, one
 * distinctive prefix per run, and an afterAll that cascades BluePassAccount -> OperatorProfile.
 *
 * `resolveOperatorAccess` is the half of the guard worth testing against real data — the redirect
 * wrapper around it is three lines of `redirect()` calls that throw by design and need a request
 * context. What matters here is that the three ways in are told apart correctly, because two of
 * them look identical from the outside (signed in, no dashboard) and mean completely different
 * things.
 */
const EMAIL_PREFIX = "operator-guard-test+";

afterAll(async () => {
  const accounts = await prisma.bluePassAccount.findMany({
    where: { email: { startsWith: EMAIL_PREFIX } },
    select: { id: true },
  });
  await prisma.bluePassAccount.deleteMany({ where: { id: { in: accounts.map((a) => a.id) } } });
});

async function account(roles: ("TRAVELLER" | "OPERATOR" | "ADMIN")[]) {
  return prisma.bluePassAccount.create({
    data: {
      email: `${EMAIL_PREFIX}${randomUUID()}@ops.bluepass.co`,
      passwordHash: "unusable-placeholder",
      displayName: "Operator Guard Test",
      roles,
    },
    select: { id: true, email: true },
  });
}

describe("resolveOperatorAccess", () => {
  it("rejects an account without the OPERATOR role, even when it has a profile", async () => {
    const traveller = await account(["TRAVELLER"]);
    /* A profile without the role is the mirror image of the case below, and it must also fail:
       the role is the permission, and inferring it from the profile's existence would mean a
       demoted operator kept access for as long as nobody deleted their row. */
    await prisma.operatorProfile.create({
      data: { accountId: traveller.id, status: "LIVE", companyName: "Guard Test Charters" },
    });

    const access = await resolveOperatorAccess(traveller.id);

    expect(access.ok).toBe(false);
    if (access.ok) return;
    expect(access.reason).toBe("NOT_OPERATOR");
  });

  it("rejects an operator-role account with no OperatorProfile attached", async () => {
    const orphan = await account(["TRAVELLER", "OPERATOR"]);

    const access = await resolveOperatorAccess(orphan.id);

    expect(access.ok).toBe(false);
    if (access.ok) return;
    /* Distinct from NOT_OPERATOR on purpose — this one is a data problem to be fixed, not a
       permission answer, and the two send the person to different explanations. */
    expect(access.reason).toBe("NO_PROFILE");
  });

  it("rejects an account id that no longer exists", async () => {
    const access = await resolveOperatorAccess(`missing-${randomUUID()}`);

    expect(access.ok).toBe(false);
    if (access.ok) return;
    expect(access.reason).toBe("SIGNED_OUT");
  });

  it("returns the account and its own profile for an operator", async () => {
    const operator = await account(["TRAVELLER", "OPERATOR"]);
    const profile = await prisma.operatorProfile.create({
      data: {
        accountId: operator.id,
        status: "LIVE",
        companyName: "Guard Test Yachts",
        payoutMethod: "STRIPE_CONNECT",
        stripeChargesEnabled: true,
        kaiTenantSlug: `guard-test-${randomUUID()}`,
      },
      select: { id: true, kaiTenantSlug: true },
    });

    const access = await resolveOperatorAccess(operator.id);

    expect(access.ok).toBe(true);
    if (!access.ok) return;
    expect(access.account.email).toBe(operator.email);
    expect(access.profile.id).toBe(profile.id);
    expect(access.profile.companyName).toBe("Guard Test Yachts");
    expect(access.profile.kaiTenantSlug).toBe(profile.kaiTenantSlug);
    expect(access.profile.stripeChargesEnabled).toBe(true);
    expect(access.profile.stripePayoutsEnabled).toBe(false);
  });

  it("never exposes the encrypted payout details to the operator surface", async () => {
    const operator = await account(["OPERATOR"]);
    await prisma.operatorProfile.create({
      data: {
        accountId: operator.id,
        status: "LIVE",
        companyName: "Guard Test Secrets",
        encryptedPayoutDetails: "ciphertext-that-must-not-be-selected",
      },
    });

    const access = await resolveOperatorAccess(operator.id);

    expect(access.ok).toBe(true);
    if (!access.ok) return;
    /* The select is the control here. Bank details are write-only by design, and a page that had
       them in its props would ship them to the browser whether or not it rendered them. */
    expect(access.profile).not.toHaveProperty("encryptedPayoutDetails");
  });
});
