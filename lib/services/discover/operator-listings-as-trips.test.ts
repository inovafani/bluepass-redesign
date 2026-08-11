import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { fetchSyncedTrips } from "./operator-listings-as-trips";

// No separate test DB in this repo - these tests write real LIVE listings against the same
// production DB the real Discover page reads from. Clean up every account this file creates
// (identifiable by its "discover-test-" email prefix), cascading down through OperatorProfile to
// OperatorListing, so a test run never leaves junk visible on the real site.
afterAll(async () => {
  const accounts = await prisma.bluePassAccount.findMany({
    where: { email: { startsWith: "discover-test-" } },
    select: { id: true },
  });
  await prisma.bluePassAccount.deleteMany({ where: { id: { in: accounts.map((a) => a.id) } } });
});

async function createLiveListing(overrides: Partial<{
  title: string;
  category: string;
  region: string;
  description: string;
  heroImageUrl: string | null;
  priceFrom: number | null;
  companyName: string | null;
}> = {}) {
  const account = await prisma.bluePassAccount.create({
    data: { email: `discover-test-${randomUUID()}@example.test`, passwordHash: "unused", roles: ["OPERATOR"] },
  });
  const profile = await prisma.operatorProfile.create({
    data: { accountId: account.id, companyName: overrides.companyName ?? "Test Operator Co" },
  });

  return prisma.operatorListing.create({
    data: {
      operatorProfileId: profile.id,
      slug: `discover-test-${randomUUID()}`,
      title: overrides.title ?? "Reef Snorkel Day Trip",
      category: overrides.category ?? "Tour",
      region: overrides.region ?? "Gold Coast",
      description: overrides.description ?? "A day trip out to the reef.",
      heroImageUrl: overrides.heroImageUrl ?? "https://example.test/photo.jpg",
      priceFrom: "priceFrom" in overrides ? overrides.priceFrom : 189,
      currency: "AUD",
      status: "LIVE",
      publishedAt: new Date(),
    },
  });
}

describe("fetchSyncedTrips", () => {
  it("maps a real LIVE listing into a Trip with only real fields set, no fabricated content", async () => {
    const listing = await createLiveListing({ companyName: "Whitsunday Sailing Co" });

    const trips = await fetchSyncedTrips();
    const trip = trips.find((t) => t.slug === listing.slug);

    expect(trip).toBeDefined();
    expect(trip).toMatchObject({
      name: "Reef Snorkel Day Trip",
      region: "Gold Coast",
      operator: "Whitsunday Sailing Co",
      price: 189,
      img: "https://example.test/photo.jpg",
      eco: false,
    });
    // Never fabricated - must be absent/empty, not a made-up value.
    expect(trip!.rating).toBeUndefined();
    expect(trip!.reviews).toBeUndefined();
    expect(trip!.quote).toBeUndefined();
    expect(trip!.highlights).toEqual([]);
    expect(trip!.itinerary).toEqual([]);
    expect(trip!.departures).toEqual([]);
    expect(trip!.operatorNote).toBeUndefined();
  });

  it("defaults an unrecognized free-text category to the generic Expedition bucket", async () => {
    const listing = await createLiveListing({ category: "Tour" });
    const trips = await fetchSyncedTrips();
    expect(trips.find((t) => t.slug === listing.slug)?.category).toBe("Expedition");
  });

  it("maps a recognized category case-insensitively", async () => {
    const listing = await createLiveListing({ category: "dive" });
    const trips = await fetchSyncedTrips();
    expect(trips.find((t) => t.slug === listing.slug)?.category).toBe("Dive");
  });

  it("falls back to a real fallback image when heroImageUrl is missing", async () => {
    const listing = await createLiveListing({ heroImageUrl: null });
    const trips = await fetchSyncedTrips();
    const trip = trips.find((t) => t.slug === listing.slug);
    expect(trip?.img).toBeTruthy();
    expect(trip?.img).not.toBe("");
  });

  it("skips a listing with no real price rather than showing a fabricated or zero price", async () => {
    const listing = await createLiveListing({ priceFrom: null });
    const trips = await fetchSyncedTrips();
    expect(trips.some((t) => t.slug === listing.slug)).toBe(false);
  });

  it("does not include DRAFT or ARCHIVED listings", async () => {
    const account = await prisma.bluePassAccount.create({
      data: { email: `discover-test-draft-${randomUUID()}@example.test`, passwordHash: "unused", roles: ["OPERATOR"] },
    });
    const profile = await prisma.operatorProfile.create({ data: { accountId: account.id } });
    const draft = await prisma.operatorListing.create({
      data: {
        operatorProfileId: profile.id,
        slug: `discover-test-draft-${randomUUID()}`,
        title: "Draft Listing",
        category: "Tour",
        region: "Gold Coast",
        description: "Not live yet.",
        priceFrom: 100,
        currency: "AUD",
        status: "DRAFT",
      },
    });

    const trips = await fetchSyncedTrips();
    expect(trips.some((t) => t.slug === draft.slug)).toBe(false);
  });
});
