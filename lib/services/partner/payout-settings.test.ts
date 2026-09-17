import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { decryptCredentials } from "@/lib/services/booking/adapters/credentials";
import { hasStoredPartnerPayoutDetails, updatePartnerPayoutDetails } from "./payout-settings";

/** Same convention as operator/payout-settings.test.ts: real rows, one distinctive prefix, an
 * afterAll that cascades BluePassAccount -> PartnerProfile. */
const EMAIL_PREFIX = "partner-payout-settings-test+";

afterAll(async () => {
  const accounts = await prisma.bluePassAccount.findMany({
    where: { email: { startsWith: EMAIL_PREFIX } },
    select: { id: true },
  });
  await prisma.bluePassAccount.deleteMany({ where: { id: { in: accounts.map((a) => a.id) } } });
});

async function createPartner(overrides: { notes?: string; encryptedPayoutDetails?: string } = {}) {
  const email = `${EMAIL_PREFIX}${randomUUID()}@partners.bluepass.co`;
  const account = await prisma.bluePassAccount.create({
    data: {
      email,
      passwordHash: randomUUID(),
      displayName: "Payout Settings Test Partner",
      emailVerifiedAt: new Date(),
      roles: ["PARTNER"],
    },
    select: { id: true, email: true },
  });

  const profile = await prisma.partnerProfile.create({
    data: {
      accountId: account.id,
      status: "APPROVED",
      handle: `payout-settings-test-${randomUUID()}`,
      notes: overrides.notes ?? "Approved by admin@bluepass.co on 2026-08-01.",
      encryptedPayoutDetails: overrides.encryptedPayoutDetails ?? null,
    },
    select: { id: true },
  });

  return { accountId: account.id, email: account.email, profileId: profile.id };
}

describe("updatePartnerPayoutDetails", () => {
  it("encrypts new bank details and appends an audit line without erasing the old notes", async () => {
    const { profileId, email } = await createPartner();

    const result = await updatePartnerPayoutDetails({
      partnerProfileId: profileId,
      updatedByEmail: email,
      bankDetails: "Account name: Reef Co\nBank ANZ\nNo 55556666",
    });

    expect(result.ok).toBe(true);

    const profile = await prisma.partnerProfile.findUniqueOrThrow({
      where: { id: profileId },
      select: { encryptedPayoutDetails: true, notes: true },
    });

    expect(profile.encryptedPayoutDetails).toBeTruthy();
    expect(profile.encryptedPayoutDetails).not.toContain("55556666");
    expect(
      decryptCredentials<{ bankDetails: string; recordedBy: string }>(profile.encryptedPayoutDetails!),
    ).toMatchObject({ bankDetails: expect.stringContaining("55556666"), recordedBy: email });

    expect(profile.notes).toContain("Approved by admin@bluepass.co");
    expect(profile.notes).toContain(`Payout details updated by ${email}`);
  });

  it("keeps existing details when the field is left blank", async () => {
    const { profileId, email } = await createPartner();

    await updatePartnerPayoutDetails({
      partnerProfileId: profileId,
      updatedByEmail: email,
      bankDetails: "Original account 99998888",
    });

    const before = await prisma.partnerProfile.findUniqueOrThrow({
      where: { id: profileId },
      select: { encryptedPayoutDetails: true },
    });

    const result = await updatePartnerPayoutDetails({
      partnerProfileId: profileId,
      updatedByEmail: email,
      bankDetails: "",
    });

    expect(result.ok).toBe(true);

    const after = await prisma.partnerProfile.findUniqueOrThrow({
      where: { id: profileId },
      select: { encryptedPayoutDetails: true },
    });

    expect(after.encryptedPayoutDetails).toBe(before.encryptedPayoutDetails);
  });

  it("refuses to save when nothing is on file and nothing is supplied", async () => {
    const { profileId, email } = await createPartner();

    expect(await hasStoredPartnerPayoutDetails(profileId)).toBe(false);

    const result = await updatePartnerPayoutDetails({
      partnerProfileId: profileId,
      updatedByEmail: email,
      bankDetails: "",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.field).toBe("bankDetails");
    expect(result.message).toMatch(/nowhere to go/i);
  });
});
