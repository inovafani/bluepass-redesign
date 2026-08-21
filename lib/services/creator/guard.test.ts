import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { resolveCreatorAccess } from "./guard";

/**
 * Same convention as operator/guard.test.ts: real rows against the shared dev database, one
 * distinctive prefix per run, and an afterAll that cascades BluePassAccount -> CreatorProfile.
 */
const EMAIL_PREFIX = "creator-guard-test+";

afterAll(async () => {
  const accounts = await prisma.bluePassAccount.findMany({
    where: { email: { startsWith: EMAIL_PREFIX } },
    select: { id: true },
  });
  await prisma.bluePassAccount.deleteMany({ where: { id: { in: accounts.map((a) => a.id) } } });
});

async function account(roles: ("TRAVELLER" | "CREATOR" | "ADMIN")[]) {
  return prisma.bluePassAccount.create({
    data: {
      email: `${EMAIL_PREFIX}${randomUUID()}@creators.bluepass.co`,
      passwordHash: "unusable-placeholder",
      displayName: "Creator Guard Test",
      roles,
    },
    select: { id: true, email: true },
  });
}

describe("resolveCreatorAccess", () => {
  it("rejects an account without the CREATOR role, even when it has a profile", async () => {
    const traveller = await account(["TRAVELLER"]);
    await prisma.creatorProfile.create({
      data: { accountId: traveller.id, status: "APPROVED", handle: "@guardtest" },
    });

    const access = await resolveCreatorAccess(traveller.id);

    expect(access.ok).toBe(false);
    if (access.ok) return;
    expect(access.reason).toBe("NOT_CREATOR");
  });

  it("rejects a creator-role account with no CreatorProfile attached", async () => {
    const orphan = await account(["TRAVELLER", "CREATOR"]);

    const access = await resolveCreatorAccess(orphan.id);

    expect(access.ok).toBe(false);
    if (access.ok) return;
    expect(access.reason).toBe("NO_PROFILE");
  });

  it("rejects an account id that no longer exists", async () => {
    const access = await resolveCreatorAccess(`missing-${randomUUID()}`);

    expect(access.ok).toBe(false);
    if (access.ok) return;
    expect(access.reason).toBe("SIGNED_OUT");
  });

  it("returns the account and its own profile for a creator", async () => {
    const creator = await account(["TRAVELLER", "CREATOR"]);
    const profile = await prisma.creatorProfile.create({
      data: {
        accountId: creator.id,
        status: "APPROVED",
        handle: "@guardtestcreator",
        instagramUrl: "https://instagram.com/guardtestcreator",
      },
      select: { id: true },
    });

    const access = await resolveCreatorAccess(creator.id);

    expect(access.ok).toBe(true);
    if (!access.ok) return;
    expect(access.account.email).toBe(creator.email);
    expect(access.profile.id).toBe(profile.id);
    expect(access.profile.handle).toBe("@guardtestcreator");
    expect(access.profile.instagramUrl).toBe("https://instagram.com/guardtestcreator");
  });
});
