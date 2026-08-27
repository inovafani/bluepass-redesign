import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { decryptCredentials } from "@/lib/services/booking/adapters/credentials";
import { createManualOperator } from "./operator-onboarding";
import {
  getOperatorForEdit,
  listOperatorProfiles,
  updateOperatorBasicInfo,
  updateOperatorPayoutForAdmin,
} from "./operator-edit";

/** Same real-DB convention as operator-onboarding.test.ts: one distinctive prefix, afterAll cascade. */
const EMAIL_PREFIX = "admin-edit-test+";
const COMPANY_PREFIX = "Admin Edit Test";
const ADMIN_EMAIL = "admin-edit-test-reviewer@bluepass.co";

afterAll(async () => {
  const accounts = await prisma.bluePassAccount.findMany({
    where: { email: { startsWith: EMAIL_PREFIX } },
    select: { id: true },
  });
  await prisma.bluePassAccount.deleteMany({ where: { id: { in: accounts.map((a) => a.id) } } });
});

async function seedOperator(overrides: Partial<Parameters<typeof createManualOperator>[0]> = {}) {
  const created = await createManualOperator({
    companyName: `${COMPANY_PREFIX} ${randomUUID()}`,
    payoutContactEmail: `${EMAIL_PREFIX}${randomUUID()}@ops.bluepass.co`,
    payoutMethod: "MANUAL_BANK_TRANSFER",
    bankDetails: "Acct: seed\nBSB 000-000\nNo 111111111",
    createdByEmail: ADMIN_EMAIL,
    ...overrides,
  });

  if (!created.ok) {
    throw new Error(`seedOperator failed: ${created.message}`);
  }

  return created;
}

describe("getOperatorForEdit", () => {
  it("returns the profile shaped for the edit form, never the ciphertext itself", async () => {
    const seeded = await seedOperator({ whatsappE164: "+61400111222", country: "au" });

    const view = await getOperatorForEdit(seeded.operatorProfileId);

    expect(view).not.toBeNull();
    expect(view!.companyName).toBe(seeded.companyName);
    expect(view!.accountEmail).toBe(seeded.payoutContactEmail);
    expect(view!.country).toBe("AU");
    // hasPayoutDetails is a boolean, not the ciphertext itself - OperatorEditView's type has no
    // encryptedPayoutDetails field at all, so nothing consuming this view can read it back out.
    expect(view!.hasPayoutDetails).toBe(true);
  });

  it("returns null for a profile id that doesn't exist", async () => {
    const view = await getOperatorForEdit("not-a-real-id");
    expect(view).toBeNull();
  });
});

describe("listOperatorProfiles", () => {
  it("includes a freshly created operator with the right summary fields", async () => {
    const seeded = await seedOperator();

    const rows = await listOperatorProfiles();
    const row = rows.find((r) => r.id === seeded.operatorProfileId);

    expect(row).toBeTruthy();
    expect(row!.companyName).toBe(seeded.companyName);
    expect(row!.hasPayoutDetails).toBe(true);
    expect(row!.status).toBe("LIVE");
  });
});

describe("updateOperatorBasicInfo", () => {
  it("saves new business details and appends an audit note", async () => {
    const seeded = await seedOperator();
    const newName = `${COMPANY_PREFIX} Renamed ${randomUUID()}`;

    const result = await updateOperatorBasicInfo({
      operatorProfileId: seeded.operatorProfileId,
      companyName: newName,
      whatsappE164: "+61400999888",
      websiteUrl: "renamed-operator.example",
      country: "nz",
      updatedByEmail: ADMIN_EMAIL,
    });

    expect(result.ok).toBe(true);

    const profile = await prisma.operatorProfile.findUniqueOrThrow({
      where: { id: seeded.operatorProfileId },
    });
    expect(profile.companyName).toBe(newName);
    expect(profile.whatsappE164).toBe("+61400999888");
    expect(profile.websiteUrl).toBe("https://renamed-operator.example");
    expect(profile.country).toBe("NZ");
    expect(profile.notes).toContain(ADMIN_EMAIL);
  });

  it("clearing the Rezdy supplier field actually clears it, since it's a visible field, not write-only", async () => {
    const rezdySupplierId = `SUP-EDIT-${randomUUID()}`;
    const seeded = await seedOperator({ rezdySupplierId });

    const result = await updateOperatorBasicInfo({
      operatorProfileId: seeded.operatorProfileId,
      companyName: seeded.companyName,
      rezdySupplierId: "",
      updatedByEmail: ADMIN_EMAIL,
    });

    expect(result.ok).toBe(true);
    const profile = await prisma.operatorProfile.findUniqueOrThrow({
      where: { id: seeded.operatorProfileId },
    });
    expect(profile.rezdySupplierId).toBeNull();
  });

  it("refuses to attach a Rezdy supplier id another profile already has", async () => {
    const rezdySupplierId = `SUP-EDIT-${randomUUID()}`;
    await seedOperator({ rezdySupplierId });
    const second = await seedOperator();

    const result = await updateOperatorBasicInfo({
      operatorProfileId: second.operatorProfileId,
      companyName: second.companyName,
      rezdySupplierId,
      updatedByEmail: ADMIN_EMAIL,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.field).toBe("rezdySupplierId");

    const profile = await prisma.operatorProfile.findUniqueOrThrow({
      where: { id: second.operatorProfileId },
    });
    expect(profile.rezdySupplierId).toBeNull();
  });

  it("re-saving a profile's own unchanged Rezdy supplier id is not treated as a clash with itself", async () => {
    const rezdySupplierId = `SUP-EDIT-${randomUUID()}`;
    const seeded = await seedOperator({ rezdySupplierId });

    const result = await updateOperatorBasicInfo({
      operatorProfileId: seeded.operatorProfileId,
      companyName: seeded.companyName,
      rezdySupplierId,
      updatedByEmail: ADMIN_EMAIL,
    });

    expect(result.ok).toBe(true);
  });
});

describe("updateOperatorPayoutForAdmin", () => {
  it("replaces bank details when new ones are supplied", async () => {
    const seeded = await seedOperator();

    const result = await updateOperatorPayoutForAdmin({
      operatorProfileId: seeded.operatorProfileId,
      payoutMethod: "MANUAL_BANK_TRANSFER",
      bankDetails: "Acct: replaced\nBSB 222-222\nNo 333333333",
      updatedByEmail: ADMIN_EMAIL,
    });

    expect(result.ok).toBe(true);
    const profile = await prisma.operatorProfile.findUniqueOrThrow({
      where: { id: seeded.operatorProfileId },
    });
    expect(
      decryptCredentials<{ bankDetails: string }>(profile.encryptedPayoutDetails!),
    ).toMatchObject({ bankDetails: "Acct: replaced\nBSB 222-222\nNo 333333333" });
  });

  it("leaves existing bank details untouched when the field is left blank", async () => {
    const seeded = await seedOperator({ bankDetails: "Acct: keep-me\nBSB 444-444\nNo 555555555" });

    const result = await updateOperatorPayoutForAdmin({
      operatorProfileId: seeded.operatorProfileId,
      payoutMethod: "MANUAL_BANK_TRANSFER",
      bankDetails: "",
      updatedByEmail: ADMIN_EMAIL,
    });

    expect(result.ok).toBe(true);
    const profile = await prisma.operatorProfile.findUniqueOrThrow({
      where: { id: seeded.operatorProfileId },
    });
    expect(
      decryptCredentials<{ bankDetails: string }>(profile.encryptedPayoutDetails!),
    ).toMatchObject({ bankDetails: "Acct: keep-me\nBSB 444-444\nNo 555555555" });
  });

  it("can switch a profile onto Stripe Connect and record the account id, unlike the operator's own self-service form", async () => {
    const seeded = await seedOperator();
    const stripeConnectAccountId = `acct_edit_${randomUUID().replace(/-/g, "")}`;

    const result = await updateOperatorPayoutForAdmin({
      operatorProfileId: seeded.operatorProfileId,
      payoutMethod: "STRIPE_CONNECT",
      stripeConnectAccountId,
      updatedByEmail: ADMIN_EMAIL,
    });

    expect(result.ok).toBe(true);
    const profile = await prisma.operatorProfile.findUniqueOrThrow({
      where: { id: seeded.operatorProfileId },
    });
    expect(profile.payoutMethod).toBe("STRIPE_CONNECT");
    expect(profile.stripeConnectAccountId).toBe(stripeConnectAccountId);
  });

  it("refuses a Stripe Connect account id another profile already has", async () => {
    const stripeConnectAccountId = `acct_edit_${randomUUID().replace(/-/g, "")}`;
    const first = await seedOperator();
    await updateOperatorPayoutForAdmin({
      operatorProfileId: first.operatorProfileId,
      payoutMethod: "STRIPE_CONNECT",
      stripeConnectAccountId,
      updatedByEmail: ADMIN_EMAIL,
    });

    const second = await seedOperator();
    const result = await updateOperatorPayoutForAdmin({
      operatorProfileId: second.operatorProfileId,
      payoutMethod: "STRIPE_CONNECT",
      stripeConnectAccountId,
      updatedByEmail: ADMIN_EMAIL,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.field).toBe("stripeConnectAccountId");
  });

  it("reports a profile that no longer exists rather than throwing", async () => {
    const result = await updateOperatorPayoutForAdmin({
      operatorProfileId: "not-a-real-id",
      payoutMethod: "MANUAL_BANK_TRANSFER",
      bankDetails: "irrelevant",
      updatedByEmail: ADMIN_EMAIL,
    });

    expect(result.ok).toBe(false);
  });
});
