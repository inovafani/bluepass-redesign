import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { decryptCredentials } from "@/lib/services/booking/adapters/credentials";
import { resolveOperatorAccess } from "./guard";
import {
  hasStoredPayoutDetails,
  parseCancellationTiers,
  PLATFORM_DEFAULT_CANCELLATION_TIERS,
  updateOperatorCancellationPolicy,
  updateOperatorPayoutDetails,
} from "./payout-settings";

/**
 * Same convention as guard.test.ts and operator-onboarding.test.ts: real rows against the shared
 * dev database, one distinctive prefix, an afterAll that cascades BluePassAccount ->
 * OperatorProfile.
 */
const EMAIL_PREFIX = "operator-payout-settings-test+";

afterAll(async () => {
  const accounts = await prisma.bluePassAccount.findMany({
    where: { email: { startsWith: EMAIL_PREFIX } },
    select: { id: true },
  });
  await prisma.bluePassAccount.deleteMany({ where: { id: { in: accounts.map((a) => a.id) } } });
});

async function createOperator(overrides: { notes?: string; encryptedPayoutDetails?: string } = {}) {
  const email = `${EMAIL_PREFIX}${randomUUID()}@ops.bluepass.co`;
  const account = await prisma.bluePassAccount.create({
    data: {
      email,
      passwordHash: randomUUID(),
      displayName: "Payout Settings Test Co",
      emailVerifiedAt: new Date(),
      roles: ["OPERATOR"],
    },
    select: { id: true, email: true },
  });

  const profile = await prisma.operatorProfile.create({
    data: {
      accountId: account.id,
      status: "LIVE",
      companyName: `Payout Settings Test ${randomUUID()}`,
      payoutContactEmail: email,
      payoutMethod: "MANUAL_BANK_TRANSFER",
      notes: overrides.notes ?? "Manually onboarded by admin@bluepass.co on 2026-08-01.",
      encryptedPayoutDetails: overrides.encryptedPayoutDetails ?? null,
    },
    select: { id: true },
  });

  return { accountId: account.id, email: account.email, profileId: profile.id };
}

describe("parseCancellationTiers", () => {
  it("accepts a well-formed descending policy with a 0-day floor", () => {
    const result = parseCancellationTiers(PLATFORM_DEFAULT_CANCELLATION_TIERS);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.tiers).toHaveLength(3);
    expect(result.tiers[2]).toEqual({ minDaysBeforeDeparture: 0, refundPercent: 0 });
  });

  it("rejects tiers that are not in descending order", () => {
    const result = parseCancellationTiers([
      { minDaysBeforeDeparture: 3, refundPercent: 50 },
      { minDaysBeforeDeparture: 14, refundPercent: 100 },
      { minDaysBeforeDeparture: 0, refundPercent: 0 },
    ]);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toMatch(/most notice to the least/i);
  });

  it("rejects a duplicated threshold", () => {
    const result = parseCancellationTiers([
      { minDaysBeforeDeparture: 7, refundPercent: 100 },
      { minDaysBeforeDeparture: 7, refundPercent: 50 },
      { minDaysBeforeDeparture: 0, refundPercent: 0 },
    ]);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toMatch(/only appear once/i);
  });

  it.each([-1, 101, 12.5])("rejects an out-of-range refund percent (%s)", (refundPercent) => {
    const result = parseCancellationTiers([
      { minDaysBeforeDeparture: 14, refundPercent },
      { minDaysBeforeDeparture: 0, refundPercent: 0 },
    ]);

    expect(result.ok).toBe(false);
  });

  it("rejects a blank row, which arrives as NaN rather than 0", () => {
    const result = parseCancellationTiers([
      { minDaysBeforeDeparture: 14, refundPercent: 100 },
      { minDaysBeforeDeparture: Number.NaN, refundPercent: Number.NaN },
    ]);

    expect(result.ok).toBe(false);
  });

  /**
   * The rule that exists because of Kai rather than because of this form. `normalizePolicy` in
   * Kai's src/core/cancellation/rules.ts throws away an entire operator policy that has no
   * `minDaysBeforeDeparture <= 0` tier and silently uses the platform default instead — so a policy
   * saved without a floor would look saved here and never be applied there.
   */
  it("rejects a policy with no 0-day floor tier, which Kai would silently discard", () => {
    const result = parseCancellationTiers([
      { minDaysBeforeDeparture: 14, refundPercent: 100 },
      { minDaysBeforeDeparture: 3, refundPercent: 50 },
    ]);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toMatch(/0 days/);
  });

  it("rejects an empty policy", () => {
    expect(parseCancellationTiers([]).ok).toBe(false);
  });
});

describe("updateOperatorPayoutDetails", () => {
  it("encrypts new bank details and appends an audit line without erasing the old notes", async () => {
    const { profileId, email } = await createOperator();

    const result = await updateOperatorPayoutDetails({
      operatorProfileId: profileId,
      updatedByEmail: email,
      payoutMethod: "MANUAL_BANK_TRANSFER",
      bankDetails: "Account name: Reef Co\nBSB 000-111\nNo 55556666",
    });

    expect(result.ok).toBe(true);

    const profile = await prisma.operatorProfile.findUniqueOrThrow({
      where: { id: profileId },
      select: { payoutMethod: true, encryptedPayoutDetails: true, notes: true },
    });

    expect(profile.payoutMethod).toBe("MANUAL_BANK_TRANSFER");
    expect(profile.encryptedPayoutDetails).toBeTruthy();
    expect(profile.encryptedPayoutDetails).not.toContain("55556666");
    expect(
      decryptCredentials<{ bankDetails: string; recordedBy: string }>(
        profile.encryptedPayoutDetails!,
      ),
    ).toMatchObject({ bankDetails: expect.stringContaining("55556666"), recordedBy: email });

    // The onboarding line survives, with the new one appended under it.
    expect(profile.notes).toContain("Manually onboarded by admin@bluepass.co");
    expect(profile.notes).toContain(`Payout details updated by ${email}`);
  });

  it("switches rail to Airwallex and stores the reference under that method", async () => {
    const { profileId, email } = await createOperator();

    const result = await updateOperatorPayoutDetails({
      operatorProfileId: profileId,
      updatedByEmail: email,
      payoutMethod: "AIRWALLEX",
      airwallexReference: "BENE-12345",
    });

    expect(result.ok).toBe(true);

    const profile = await prisma.operatorProfile.findUniqueOrThrow({
      where: { id: profileId },
      select: { payoutMethod: true, encryptedPayoutDetails: true },
    });

    expect(profile.payoutMethod).toBe("AIRWALLEX");
    expect(
      decryptCredentials<{ method: string; airwallexReference: string }>(
        profile.encryptedPayoutDetails!,
      ),
    ).toMatchObject({ method: "AIRWALLEX", airwallexReference: "BENE-12345" });
  });

  /** Blank means "keep what you have" — the operator cannot see the stored value to retype it. */
  it("keeps existing details when the field is left blank", async () => {
    const { profileId, email } = await createOperator();

    await updateOperatorPayoutDetails({
      operatorProfileId: profileId,
      updatedByEmail: email,
      payoutMethod: "MANUAL_BANK_TRANSFER",
      bankDetails: "Original account 99998888",
    });

    const before = await prisma.operatorProfile.findUniqueOrThrow({
      where: { id: profileId },
      select: { encryptedPayoutDetails: true },
    });

    const result = await updateOperatorPayoutDetails({
      operatorProfileId: profileId,
      updatedByEmail: email,
      payoutMethod: "AIRWALLEX",
      airwallexReference: "",
    });

    expect(result.ok).toBe(true);

    const after = await prisma.operatorProfile.findUniqueOrThrow({
      where: { id: profileId },
      select: { payoutMethod: true, encryptedPayoutDetails: true },
    });

    expect(after.payoutMethod).toBe("AIRWALLEX");
    expect(after.encryptedPayoutDetails).toBe(before.encryptedPayoutDetails);
  });

  it("refuses a rail with nowhere to send money when nothing is on file", async () => {
    const { profileId, email } = await createOperator();

    expect(await hasStoredPayoutDetails(profileId)).toBe(false);

    const result = await updateOperatorPayoutDetails({
      operatorProfileId: profileId,
      updatedByEmail: email,
      payoutMethod: "MANUAL_BANK_TRANSFER",
      bankDetails: "",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.field).toBe("bankDetails");
    expect(result.message).toMatch(/nowhere to go/i);
  });
});

describe("updateOperatorCancellationPolicy", () => {
  it("saves a valid policy and shows it on the next load through the guard", async () => {
    const { profileId, accountId, email } = await createOperator();

    const before = await resolveOperatorAccess(accountId);
    expect(before.ok).toBe(true);
    if (!before.ok) return;
    expect(before.profile.cancellationPolicyTiers).toBeNull();

    const tiers = [
      { minDaysBeforeDeparture: 30, refundPercent: 100 },
      { minDaysBeforeDeparture: 7, refundPercent: 25 },
      { minDaysBeforeDeparture: 0, refundPercent: 0 },
    ];

    const result = await updateOperatorCancellationPolicy({
      operatorProfileId: profileId,
      updatedByEmail: email,
      tiers,
    });

    expect(result.ok).toBe(true);

    /* The point of the test: what the dashboard reads on its next render actually changed. */
    const after = await resolveOperatorAccess(accountId);
    expect(after.ok).toBe(true);
    if (!after.ok) return;
    expect(after.profile.cancellationPolicyTiers).toEqual(tiers);
  });

  it("writes nothing when the policy is invalid", async () => {
    const { profileId, accountId, email } = await createOperator();

    const result = await updateOperatorCancellationPolicy({
      operatorProfileId: profileId,
      updatedByEmail: email,
      tiers: [{ minDaysBeforeDeparture: 5, refundPercent: 100 }],
    });

    expect(result.ok).toBe(false);

    const after = await resolveOperatorAccess(accountId);
    expect(after.ok).toBe(true);
    if (!after.ok) return;
    expect(after.profile.cancellationPolicyTiers).toBeNull();
  });
});
