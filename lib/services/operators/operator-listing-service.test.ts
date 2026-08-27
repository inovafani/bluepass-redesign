import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { fetchSyncedTrips } from "@/lib/services/discover/operator-listings-as-trips";
import { createDraftListing, publishListing, updateDraftListing } from "./operator-listing-service";

/** Same real-DB convention as dashboard.test.ts: one distinctive prefix, afterAll cascade. */
const EMAIL_PREFIX = "operator-listing-test+";
const TITLE_PREFIX = "Operator Listing Test";

afterAll(async () => {
  const accounts = await prisma.bluePassAccount.findMany({
    where: { email: { startsWith: EMAIL_PREFIX } },
    select: { id: true },
  });
  await prisma.bluePassAccount.deleteMany({ where: { id: { in: accounts.map((a) => a.id) } } });
});

async function operatorAccount() {
  const account = await prisma.bluePassAccount.create({
    data: {
      email: `${EMAIL_PREFIX}${randomUUID()}@ops.bluepass.co`,
      passwordHash: "unusable-placeholder",
      roles: ["OPERATOR"],
      operatorProfile: {
        create: {
          status: "LIVE",
          companyName: `${TITLE_PREFIX} Co ${randomUUID()}`,
        },
      },
    },
    select: { id: true },
  });

  return account.id;
}

function listingInput<T extends { accountId: string }>(overrides: T) {
  return {
    title: `${TITLE_PREFIX} ${randomUUID()}`,
    category: "Sailing",
    region: "Whitsundays",
    description: "A full day on the water, written for a live-verification test.",
    ...overrides,
  };
}

describe("createDraftListing / priceFrom", () => {
  it("auto-generates priceSignal from priceFrom when none is given", async () => {
    const accountId = await operatorAccount();
    const listing = await createDraftListing(listingInput({ accountId, priceFrom: 189 }));

    expect(listing.priceFrom).toBe(189);
    expect(listing.priceSignal).toBe("From AUD 189");
    expect(listing.currency).toBe("AUD");
  });

  it("keeps an operator's own priceSignal wording instead of overwriting it", async () => {
    const accountId = await operatorAccount();
    const listing = await createDraftListing(
      listingInput({ accountId, priceFrom: 189, priceSignal: "From $189 per person, twin share" }),
    );

    expect(listing.priceFrom).toBe(189);
    expect(listing.priceSignal).toBe("From $189 per person, twin share");
  });

  it("saves fine with no priceFrom at all, leaving it null", async () => {
    const accountId = await operatorAccount();
    const listing = await createDraftListing(listingInput({ accountId }));

    expect(listing.priceFrom).toBeNull();
    expect(listing.priceSignal).toBeNull();
  });
});

describe("updateDraftListing / priceFrom", () => {
  it("can add a priceFrom to a draft that started without one", async () => {
    const accountId = await operatorAccount();
    const created = await createDraftListing(listingInput({ accountId }));

    const updated = await updateDraftListing(
      listingInput({ accountId, listingId: created.id, priceFrom: 250 }),
    );

    expect(updated.priceFrom).toBe(250);
    expect(updated.priceSignal).toBe("From AUD 250");
  });
});

describe("fetchSyncedTrips and priceFrom", () => {
  it("only shows a LIVE listing that has a real priceFrom - not a DRAFT one, not a priceless one", async () => {
    const accountId = await operatorAccount();

    const withPrice = await createDraftListing(listingInput({ accountId, priceFrom: 275 }));
    await publishListing({ listingId: withPrice.id, accountId });

    const withoutPrice = await createDraftListing(listingInput({ accountId }));
    await publishListing({ listingId: withoutPrice.id, accountId });

    const stillDraft = await createDraftListing(listingInput({ accountId, priceFrom: 300 }));

    const trips = await fetchSyncedTrips();
    const slugs = trips.map((trip) => trip.slug);

    expect(slugs).toContain(withPrice.slug);
    expect(slugs).not.toContain(withoutPrice.slug);
    expect(slugs).not.toContain(stillDraft.slug);

    const trip = trips.find((t) => t.slug === withPrice.slug);
    expect(trip?.price).toBe(275);
  });
});
