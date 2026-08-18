import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  fetchRezdyAgentMarketplaceProducts,
  syncRezdyAgentMarketplaceProducts,
  type RezdyMarketplaceProduct,
} from "./rezdy-agent-sync";

// This repo has no separate test database - these tests write real LIVE OperatorListing rows
// against the same production DB the real Discover page reads from (confirmed the hard way:
// leftover rows from an earlier run of this file showed up on bluepass.co with test UUIDs in the
// title). Every account this file creates uses the same "rezdy+" email prefix as the real sync
// (deliberately, to test the real upsert path) - clean them all up, cascading down through
// OperatorProfile to OperatorListing, so a real test run never leaves live junk on the real site.
// The name-fallback test also seeds a *manually onboarded* profile (no "rezdy+" email, because the
// whole point is that it wasn't created by this sync), so its own prefix has to be cleaned up too.
const MANUAL_EMAIL_PREFIX = "admin-sync-test+";

afterAll(async () => {
  const accounts = await prisma.bluePassAccount.findMany({
    where: {
      OR: [{ email: { startsWith: "rezdy+SUP-" } }, { email: { startsWith: MANUAL_EMAIL_PREFIX } }],
    },
    select: { id: true },
  });
  await prisma.bluePassAccount.deleteMany({ where: { id: { in: accounts.map((a) => a.id) } } });
});

function product(overrides: Partial<RezdyMarketplaceProduct> = {}): RezdyMarketplaceProduct {
  return {
    productCode: `AGT-${randomUUID()}`,
    name: `Whitsundays Sunset Sail ${randomUUID()}`,
    description: "A relaxed sunset sail through the Whitsundays.",
    /* Unique per product. The sync now matches an unclaimed profile by company name, so a fixed
       fixture name silently couples this file to any other test (or real row) that happens to use
       the same one - operator-listings-as-trips.test.ts seeds a "Whitsunday Sailing Co" profile
       with no supplier id, and running in parallel it was this file's supplier that adopted it. */
    supplierName: `Whitsunday Sailing Co ${randomUUID()}`,
    supplierId: `SUP-${randomUUID()}`,
    region: "Whitsundays",
    priceFrom: 189,
    currency: "AUD",
    imageUrl: "https://example.test/large.jpg",
    productUrl: null,
    ...overrides,
  };
}

describe("syncRezdyAgentMarketplaceProducts", () => {
  it("auto-creates a placeholder account, operator profile, and a LIVE listing for a new supplier", async () => {
    const p = product();

    const result = await syncRezdyAgentMarketplaceProducts([p]);

    expect(result).toEqual({ productsSeen: 1, operatorsCreated: 1, listingsCreated: 1, listingsUpdated: 0 });

    const profile = await prisma.operatorProfile.findUniqueOrThrow({ where: { rezdySupplierId: p.supplierId } });
    expect(profile).toMatchObject({ companyName: p.supplierName, status: "LIVE", country: "AU" });

    const account = await prisma.bluePassAccount.findUniqueOrThrow({ where: { id: profile.accountId } });
    expect(account.email).toBe(`rezdy+${p.supplierId}@ops.bluepass.co`);
    expect(account.roles).toContain("OPERATOR");

    const listing = await prisma.operatorListing.findFirstOrThrow({
      where: { operatorProfileId: profile.id, title: p.name },
    });
    expect(listing).toMatchObject({
      status: "LIVE",
      region: "Whitsundays",
      heroImageUrl: "https://example.test/large.jpg",
      priceSignal: "From AUD 189",
      priceFrom: 189,
    });
    expect(listing.publishedAt).not.toBeNull();
  });

  it("is idempotent - syncing the same supplier again updates the listing instead of duplicating it", async () => {
    const p = product();
    await syncRezdyAgentMarketplaceProducts([p]);

    const updated = { ...p, priceFrom: 250, description: "Updated description." };
    const result = await syncRezdyAgentMarketplaceProducts([updated]);

    expect(result).toEqual({ productsSeen: 1, operatorsCreated: 0, listingsCreated: 0, listingsUpdated: 1 });

    const profiles = await prisma.operatorProfile.findMany({ where: { rezdySupplierId: p.supplierId } });
    expect(profiles).toHaveLength(1);

    const listing = await prisma.operatorListing.findFirstOrThrow({
      where: { operatorProfileId: profiles[0].id, title: p.name },
    });
    expect(listing.priceSignal).toBe("From AUD 250");
    expect(listing.priceFrom).toBe(250);
    expect(listing.description).toBe("Updated description.");
  });

  it("backfills a manually onboarded profile matched by name instead of creating a duplicate", async () => {
    /* The scenario Part 3's onboarding form creates: a real operator with real payout details,
       onboarded by an admin before anyone knew their Rezdy supplier id. When the sync later sees
       their products, the listings must attach to *this* profile — not to a second placeholder
       account that leaves the payout details stranded on a profile nobody looks at. */
    const companyName = `Manual Onboard Co ${randomUUID()}`;
    const account = await prisma.bluePassAccount.create({
      data: {
        email: `${MANUAL_EMAIL_PREFIX}${randomUUID()}@ops.bluepass.co`,
        passwordHash: randomUUID(),
        displayName: companyName,
        roles: ["OPERATOR"],
      },
    });
    const seeded = await prisma.operatorProfile.create({
      data: {
        accountId: account.id,
        companyName,
        status: "LIVE",
        rezdySupplierId: null,
        payoutContactEmail: account.email,
      },
    });

    // Casing deliberately differs — Rezdy's supplierName will not match how an admin typed it.
    const p = product({ supplierName: companyName.toUpperCase() });
    const result = await syncRezdyAgentMarketplaceProducts([p]);

    expect(result.operatorsCreated).toBe(0);

    const profiles = await prisma.operatorProfile.findMany({
      where: { companyName: { equals: companyName, mode: "insensitive" } },
    });
    expect(profiles).toHaveLength(1);
    expect(profiles[0].id).toBe(seeded.id);
    expect(profiles[0].rezdySupplierId).toBe(p.supplierId);
    // The listing hangs off the profile that holds the payout details.
    const listing = await prisma.operatorListing.findFirstOrThrow({
      where: { operatorProfileId: seeded.id, title: p.name },
    });
    expect(listing.status).toBe("LIVE");
    // No second placeholder account was minted for the same business.
    expect(
      await prisma.bluePassAccount.count({ where: { email: `rezdy+${p.supplierId}@ops.bluepass.co` } }),
    ).toBe(0);
  });

  it("refuses to guess when two unclaimed profiles share the supplier name", async () => {
    /* An ambiguous name must not resolve to whichever row is older — that would hand one real
       business's listings, and eventually its payouts, to another. Falling through to a visible
       placeholder is the safer failure. */
    const companyName = `Ambiguous Onboard Co ${randomUUID()}`;
    for (let i = 0; i < 2; i += 1) {
      const account = await prisma.bluePassAccount.create({
        data: {
          email: `${MANUAL_EMAIL_PREFIX}${randomUUID()}@ops.bluepass.co`,
          passwordHash: randomUUID(),
          roles: ["OPERATOR"],
        },
      });
      await prisma.operatorProfile.create({
        data: { accountId: account.id, companyName, status: "LIVE", rezdySupplierId: null },
      });
    }

    const p = product({ supplierName: companyName });
    const result = await syncRezdyAgentMarketplaceProducts([p]);

    expect(result.operatorsCreated).toBe(1);
    const seeded = await prisma.operatorProfile.findMany({
      where: { companyName: { equals: companyName, mode: "insensitive" }, rezdySupplierId: null },
    });
    expect(seeded).toHaveLength(2);
    const placeholder = await prisma.operatorProfile.findUniqueOrThrow({
      where: { rezdySupplierId: p.supplierId },
    });
    expect(seeded.map((s) => s.id)).not.toContain(placeholder.id);
  });

  it("never steals a supplier id from a profile that already has a different one", async () => {
    const first = product();
    await syncRezdyAgentMarketplaceProducts([first]);

    // Same supplierName, different supplierId: the existing profile is already claimed by `first`,
    // so the name fallback must not touch it and a genuinely new supplier gets its own profile.
    const second = product({ supplierName: first.supplierName });
    const result = await syncRezdyAgentMarketplaceProducts([second]);

    expect(result.operatorsCreated).toBe(1);
    const firstProfile = await prisma.operatorProfile.findUniqueOrThrow({
      where: { rezdySupplierId: first.supplierId },
    });
    const secondProfile = await prisma.operatorProfile.findUniqueOrThrow({
      where: { rezdySupplierId: second.supplierId },
    });
    expect(firstProfile.id).not.toBe(secondProfile.id);
  });

  it("skips a product with no supplierId or no name rather than creating a broken record", async () => {
    const result = await syncRezdyAgentMarketplaceProducts([
      product({ supplierId: "" }),
      product({ name: "" }),
    ]);

    expect(result).toEqual({ productsSeen: 0, operatorsCreated: 0, listingsCreated: 0, listingsUpdated: 0 });
  });

  it("defaults missing region/currency/price to sensible fallbacks instead of nulls that break the UI", async () => {
    const p = product({ region: "", currency: "", priceFrom: null });

    await syncRezdyAgentMarketplaceProducts([p]);

    const profile = await prisma.operatorProfile.findUniqueOrThrow({ where: { rezdySupplierId: p.supplierId } });
    const listing = await prisma.operatorListing.findFirstOrThrow({
      where: { operatorProfileId: profile.id, title: p.name },
    });
    expect(listing.region).toBe("Australia");
    expect(listing.currency).toBe("AUD");
    expect(listing.priceSignal).toBeNull();
  });
});

describe("fetchRezdyAgentMarketplaceProducts", () => {
  it("sends the internal token header and returns the parsed products array", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ products: [product()] }), { status: 200 }));

    const products = await fetchRezdyAgentMarketplaceProducts(
      { REZDY_AGENT_SYNC_TOKEN: "secret", KAI_CORE_BASE_URL: "https://kai.example" },
      fetchImpl as unknown as typeof fetch,
    );

    expect(products).toHaveLength(1);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://kai.example/api/internal/rezdy-agent/marketplace-products");
    expect((init.headers as Record<string, string>)["x-kai-internal-token"]).toBe("secret");
  });

  it("throws when REZDY_AGENT_SYNC_TOKEN is not configured", async () => {
    await expect(fetchRezdyAgentMarketplaceProducts({}, vi.fn() as unknown as typeof fetch)).rejects.toThrow(
      "REZDY_AGENT_SYNC_TOKEN is not configured.",
    );
  });

  it("throws with the response status when Kai's endpoint rejects the request", async () => {
    const fetchImpl = vi.fn(async () => new Response("", { status: 401 }));

    await expect(
      fetchRezdyAgentMarketplaceProducts({ REZDY_AGENT_SYNC_TOKEN: "secret" }, fetchImpl as unknown as typeof fetch),
    ).rejects.toThrow("status 401");
  });
});
