import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { resolvePartnerAccess } from "./guard";

/**
 * Same convention as operator/guard.test.ts: real rows against the shared dev database, one
 * distinctive prefix per run, and an afterAll that cascades BluePassAccount -> PartnerProfile.
 */
const EMAIL_PREFIX = "partner-guard-test+";

afterAll(async () => {
  const accounts = await prisma.bluePassAccount.findMany({
    where: { email: { startsWith: EMAIL_PREFIX } },
    select: { id: true },
  });
  await prisma.bluePassAccount.deleteMany({ where: { id: { in: accounts.map((a) => a.id) } } });
});

async function account(roles: ("TRAVELLER" | "PARTNER" | "ADMIN")[]) {
  return prisma.bluePassAccount.create({
    data: {
      email: `${EMAIL_PREFIX}${randomUUID()}@partners.bluepass.co`,
      passwordHash: "unusable-placeholder",
      displayName: "Partner Guard Test",
      roles,
    },
    select: { id: true, email: true },
  });
}

describe("resolvePartnerAccess", () => {
  it("rejects an account without the PARTNER role, even when it has a profile", async () => {
    const traveller = await account(["TRAVELLER"]);
    await prisma.partnerProfile.create({
      data: { accountId: traveller.id, status: "APPROVED", handle: "@guardtest" },
    });

    const access = await resolvePartnerAccess(traveller.id);

    expect(access.ok).toBe(false);
    if (access.ok) return;
    expect(access.reason).toBe("NOT_PARTNER");
  });

  it("rejects a partner-role account with no PartnerProfile attached", async () => {
    const orphan = await account(["TRAVELLER", "PARTNER"]);

    const access = await resolvePartnerAccess(orphan.id);

    expect(access.ok).toBe(false);
    if (access.ok) return;
    expect(access.reason).toBe("NO_PROFILE");
  });

  it("rejects an account id that no longer exists", async () => {
    const access = await resolvePartnerAccess(`missing-${randomUUID()}`);

    expect(access.ok).toBe(false);
    if (access.ok) return;
    expect(access.reason).toBe("SIGNED_OUT");
  });

  it("returns the account and its own profile for a partner", async () => {
    const partner = await account(["TRAVELLER", "PARTNER"]);
    const profile = await prisma.partnerProfile.create({
      data: {
        accountId: partner.id,
        status: "APPROVED",
        handle: "@guardtestpartner",
        instagramUrl: "https://instagram.com/guardtestpartner",
      },
      select: { id: true },
    });

    const access = await resolvePartnerAccess(partner.id);

    expect(access.ok).toBe(true);
    if (!access.ok) return;
    expect(access.account.email).toBe(partner.email);
    expect(access.profile.id).toBe(profile.id);
    expect(access.profile.handle).toBe("@guardtestpartner");
    expect(access.profile.instagramUrl).toBe("https://instagram.com/guardtestpartner");
  });
});
