import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { decryptCredentials } from "@/lib/services/booking/adapters/credentials";
import { createManualOperator } from "./operator-onboarding";

/**
 * Same convention as rezdy-agent-sync.test.ts: real rows against the shared dev database, one
 * distinctive prefix per run, and an afterAll that cascades BluePassAccount -> OperatorProfile so a
 * test run never leaves a fake "operator" sitting in the real data with LIVE status and a payout
 * method attached to it.
 */
const EMAIL_PREFIX = "admin-onboard-test+";
const COMPANY_PREFIX = "Admin Onboard Test";
const ADMIN_EMAIL = "admin-onboard-test-reviewer@bluepass.co";

afterAll(async () => {
  const accounts = await prisma.bluePassAccount.findMany({
    where: { email: { startsWith: EMAIL_PREFIX } },
    select: { id: true },
  });
  await prisma.bluePassAccount.deleteMany({ where: { id: { in: accounts.map((a) => a.id) } } });
});

function input(overrides: Partial<Parameters<typeof createManualOperator>[0]> = {}) {
  return {
    companyName: `${COMPANY_PREFIX} ${randomUUID()}`,
    payoutContactEmail: `${EMAIL_PREFIX}${randomUUID()}@ops.bluepass.co`,
    payoutMethod: "MANUAL_BANK_TRANSFER" as const,
    createdByEmail: ADMIN_EMAIL,
    ...overrides,
  };
}

describe("createManualOperator", () => {
  it("creates a LIVE profile with an operator account and encrypted bank details", async () => {
    const data = input({
      whatsappE164: "+61400111222",
      websiteUrl: "operator.example",
      country: "au",
      bankDetails: "Acct: Whitsunday Sailing Co\nBSB 123-456\nNo 987654321",
      rezdySupplierId: `SUP-${randomUUID()}`,
    });

    const result = await createManualOperator(data);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const profile = await prisma.operatorProfile.findUniqueOrThrow({
      where: { id: result.operatorProfileId },
      include: { account: true },
    });

    expect(profile.status).toBe("LIVE");
    expect(profile.companyName).toBe(data.companyName);
    expect(profile.payoutContactEmail).toBe(data.payoutContactEmail);
    expect(profile.payoutMethod).toBe("MANUAL_BANK_TRANSFER");
    expect(profile.whatsappE164).toBe("+61400111222");
    // A bare domain is stored as an absolute URL, and the country as ISO alpha-2.
    expect(profile.websiteUrl).toBe("https://operator.example");
    expect(profile.country).toBe("AU");
    expect(profile.rezdySupplierId).toBe(data.rezdySupplierId);
    expect(profile.notes).toContain(ADMIN_EMAIL);

    expect(profile.account.email).toBe(data.payoutContactEmail);
    expect(profile.account.roles).toContain("OPERATOR");
    expect(profile.account.displayName).toBe(data.companyName);

    // Bank details are ciphertext on disk and only readable through the shared helper.
    expect(profile.encryptedPayoutDetails).toBeTruthy();
    expect(profile.encryptedPayoutDetails).not.toContain("987654321");
    expect(decryptCredentials<{ bankDetails: string; recordedBy: string }>(profile.encryptedPayoutDetails!)).toMatchObject(
      { bankDetails: data.bankDetails, recordedBy: ADMIN_EMAIL },
    );
  });

  it("blocks a second profile for the same company name, case-insensitively", async () => {
    const first = input();
    const created = await createManualOperator(first);
    expect(created.ok).toBe(true);

    const result = await createManualOperator(
      input({ companyName: first.companyName.toUpperCase() }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("DUPLICATE_PROFILE");
    if (result.code !== "DUPLICATE_PROFILE") return;
    expect(result.duplicate.matchedOn).toBe("companyName");
    expect(result.duplicate.companyName).toBe(first.companyName);
    expect(result.message).toContain(first.companyName);

    // And nothing was written while it was being refused.
    const profiles = await prisma.operatorProfile.findMany({
      where: { companyName: { equals: first.companyName, mode: "insensitive" } },
    });
    expect(profiles).toHaveLength(1);
  });

  it("creates the second same-name profile once the admin explicitly confirms", async () => {
    const first = input();
    await createManualOperator(first);

    const result = await createManualOperator(
      input({ companyName: first.companyName, confirmDuplicate: true }),
    );

    expect(result.ok).toBe(true);
    const profiles = await prisma.operatorProfile.findMany({
      where: { companyName: { equals: first.companyName, mode: "insensitive" } },
    });
    expect(profiles).toHaveLength(2);
  });

  it("blocks a duplicate rezdySupplierId and refuses to be overridden", async () => {
    const rezdySupplierId = `SUP-${randomUUID()}`;
    await createManualOperator(input({ rezdySupplierId }));

    /* Different company name, so only the supplier id collides — and unlike a name clash this one
       cannot be confirmed past, because the column is unique. */
    const result = await createManualOperator(
      input({ rezdySupplierId, confirmDuplicate: true }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("DUPLICATE_PROFILE");
    if (result.code !== "DUPLICATE_PROFILE") return;
    expect(result.duplicate.matchedOn).toBe("rezdySupplierId");

    const profiles = await prisma.operatorProfile.findMany({ where: { rezdySupplierId } });
    expect(profiles).toHaveLength(1);
  });

  it("refuses a payout contact email that already has an account, without orphaning one", async () => {
    const first = input();
    await createManualOperator(first);

    const accountsBefore = await prisma.bluePassAccount.count({
      where: { email: first.payoutContactEmail },
    });

    const result = await createManualOperator(
      input({ payoutContactEmail: first.payoutContactEmail.toUpperCase() }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("EMAIL_TAKEN");
    expect(await prisma.bluePassAccount.count({ where: { email: first.payoutContactEmail } })).toBe(
      accountsBefore,
    );
  });

  it("rejects a missing company name and a malformed email before touching the database", async () => {
    const noName = await createManualOperator(input({ companyName: " " }));
    expect(noName.ok).toBe(false);
    if (!noName.ok && noName.code === "VALIDATION") {
      expect(noName.field).toBe("companyName");
    } else {
      expect.unreachable("a blank company name must fail validation");
    }

    const badEmail = await createManualOperator(input({ payoutContactEmail: "not-an-email" }));
    expect(badEmail.ok).toBe(false);
    if (!badEmail.ok && badEmail.code === "VALIDATION") {
      expect(badEmail.field).toBe("payoutContactEmail");
    } else {
      expect.unreachable("a malformed email must fail validation");
    }
  });

  it("records an Airwallex reference in the encrypted payout column, unvalidated", async () => {
    const result = await createManualOperator(
      input({ payoutMethod: "AIRWALLEX", airwallexReference: "whatever-BD-sent-over" }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const profile = await prisma.operatorProfile.findUniqueOrThrow({
      where: { id: result.operatorProfileId },
    });
    expect(profile.payoutMethod).toBe("AIRWALLEX");
    expect(
      decryptCredentials<{ airwallexReference: string }>(profile.encryptedPayoutDetails!)
        .airwallexReference,
    ).toBe("whatever-BD-sent-over");
  });

  it("records a Stripe Connect account id without encrypting it, and rejects a reused one", async () => {
    const stripeConnectAccountId = `acct_${randomUUID().replace(/-/g, "")}`;
    const created = await createManualOperator(
      input({ payoutMethod: "STRIPE_CONNECT", stripeConnectAccountId }),
    );

    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const profile = await prisma.operatorProfile.findUniqueOrThrow({
      where: { id: created.operatorProfileId },
    });
    expect(profile.stripeConnectAccountId).toBe(stripeConnectAccountId);
    // Not a secret, so it stays queryable rather than going into the encrypted blob.
    expect(profile.encryptedPayoutDetails).toBeNull();

    const reused = await createManualOperator(
      input({ payoutMethod: "STRIPE_CONNECT", stripeConnectAccountId }),
    );
    expect(reused.ok).toBe(false);
    if (!reused.ok) {
      expect(reused.code).toBe("STRIPE_ACCOUNT_TAKEN");
    }
  });
});
