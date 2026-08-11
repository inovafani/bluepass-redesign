import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { resolveOperatorPayoutAccount, type CancellationPolicyTier } from "./operator-payout-account";

const createdAccountIds: string[] = [];

async function createLinkedOperatorProfile(kaiTenantSlug: string, overrides: Partial<{
  stripeConnectAccountId: string;
  stripeChargesEnabled: boolean;
  stripePayoutsEnabled: boolean;
  cancellationPolicyTiers: CancellationPolicyTier[];
  payoutMethod: "MANUAL_BANK_TRANSFER" | "STRIPE_CONNECT" | "AIRWALLEX";
}> = {}) {
  const account = await prisma.bluePassAccount.create({
    data: {
      email: `operator-payout-${randomUUID()}@example.test`,
      passwordHash: "unused-in-test",
      roles: ["OPERATOR"],
    },
  });
  createdAccountIds.push(account.id);

  return prisma.operatorProfile.create({
    data: {
      accountId: account.id,
      kaiTenantSlug,
      ...overrides,
    },
  });
}

// No test DB exists in this repo - these tests write real rows to the same Supabase instance
// production reads from. Cleanup cascades from BluePassAccount -> OperatorProfile.
afterAll(async () => {
  if (createdAccountIds.length === 0) return;
  await prisma.bluePassAccount.deleteMany({ where: { id: { in: createdAccountIds } } });
});

describe("resolveOperatorPayoutAccount", () => {
  it("returns the linked operator's Stripe Connect account and onboarding status", async () => {
    const tenantSlug = `boattime-test-${randomUUID()}`;
    const stripeConnectAccountId = `acct_test_${randomUUID()}`;
    await createLinkedOperatorProfile(tenantSlug, {
      stripeConnectAccountId,
      stripeChargesEnabled: true,
      stripePayoutsEnabled: true,
    });

    await expect(resolveOperatorPayoutAccount(tenantSlug)).resolves.toEqual({
      stripeConnectAccountId,
      chargesEnabled: true,
      payoutsEnabled: true,
      cancellationPolicyTiers: null,
      payoutMethod: "MANUAL_BANK_TRANSFER",
    });
  });

  it("returns all-null/false, not an error, when no OperatorProfile is linked to the tenant slug yet", async () => {
    await expect(resolveOperatorPayoutAccount(`unlinked-tenant-${randomUUID()}`)).resolves.toEqual({
      stripeConnectAccountId: null,
      chargesEnabled: false,
      payoutsEnabled: false,
      cancellationPolicyTiers: null,
      payoutMethod: "MANUAL_BANK_TRANSFER",
    });
  });

  it("returns false/null for an operator that's linked but hasn't finished Stripe Connect onboarding", async () => {
    const tenantSlug = `not-onboarded-${randomUUID()}`;
    await createLinkedOperatorProfile(tenantSlug);

    await expect(resolveOperatorPayoutAccount(tenantSlug)).resolves.toEqual({
      stripeConnectAccountId: null,
      chargesEnabled: false,
      payoutsEnabled: false,
      cancellationPolicyTiers: null,
      payoutMethod: "MANUAL_BANK_TRANSFER",
    });
  });

  it("returns the operator's own cancellation policy tiers when set", async () => {
    const tenantSlug = `policy-set-${randomUUID()}`;
    const tiers: CancellationPolicyTier[] = [
      { minDaysBeforeDeparture: 14, refundPercent: 100 },
      { minDaysBeforeDeparture: 0, refundPercent: 25 },
    ];
    await createLinkedOperatorProfile(tenantSlug, { cancellationPolicyTiers: tiers });

    const result = await resolveOperatorPayoutAccount(tenantSlug);
    expect(result.cancellationPolicyTiers).toEqual(tiers);
  });

  it("returns the operator's own payoutMethod, including AIRWALLEX", async () => {
    const tenantSlug = `airwallex-op-${randomUUID()}`;
    await createLinkedOperatorProfile(tenantSlug, { payoutMethod: "AIRWALLEX" });

    const result = await resolveOperatorPayoutAccount(tenantSlug);
    expect(result.payoutMethod).toBe("AIRWALLEX");
  });
});
