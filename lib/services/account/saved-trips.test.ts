import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { listSavedTripSlugs, toggleSavedTrip } from "./saved-trips";

/**
 * Same convention as creator/guard.test.ts: real rows against the shared dev database, one
 * distinctive prefix per run, and an afterAll that cascades BluePassAccount -> SavedTrip.
 */
const EMAIL_PREFIX = "saved-trips-test+";

afterAll(async () => {
  const accounts = await prisma.bluePassAccount.findMany({
    where: { email: { startsWith: EMAIL_PREFIX } },
    select: { id: true },
  });
  await prisma.bluePassAccount.deleteMany({ where: { id: { in: accounts.map((a) => a.id) } } });
});

async function account() {
  return prisma.bluePassAccount.create({
    data: {
      email: `${EMAIL_PREFIX}${randomUUID()}@travellers.bluepass.co`,
      passwordHash: "unusable-placeholder",
      displayName: "Saved Trips Test",
      roles: ["TRAVELLER"],
    },
    select: { id: true },
  });
}

describe("toggleSavedTrip", () => {
  it("saves a trip that wasn't shortlisted yet", async () => {
    const traveller = await account();

    const result = await toggleSavedTrip(traveller.id, "ribbon-reefs-run");

    expect(result).toEqual({ saved: true });
    expect(await listSavedTripSlugs(traveller.id)).toEqual(["ribbon-reefs-run"]);
  });

  it("un-saves a trip that was already shortlisted", async () => {
    const traveller = await account();
    await toggleSavedTrip(traveller.id, "humpback-highway");

    const result = await toggleSavedTrip(traveller.id, "humpback-highway");

    expect(result).toEqual({ saved: false });
    expect(await listSavedTripSlugs(traveller.id)).toEqual([]);
  });

  it("never touches another traveller's shortlist", async () => {
    const travellerA = await account();
    const travellerB = await account();
    await toggleSavedTrip(travellerA.id, "harbour-nights");

    expect(await listSavedTripSlugs(travellerB.id)).toEqual([]);
  });
});

describe("listSavedTripSlugs", () => {
  it("returns nothing for an account with an empty shortlist", async () => {
    const traveller = await account();

    expect(await listSavedTripSlugs(traveller.id)).toEqual([]);
  });
});
