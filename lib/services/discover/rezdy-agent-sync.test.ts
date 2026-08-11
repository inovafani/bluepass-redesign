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
afterAll(async () => {
  const accounts = await prisma.bluePassAccount.findMany({
    where: { email: { startsWith: "rezdy+SUP-" } },
    select: { id: true },
  });
  await prisma.bluePassAccount.deleteMany({ where: { id: { in: accounts.map((a) => a.id) } } });
});

function product(overrides: Partial<RezdyMarketplaceProduct> = {}): RezdyMarketplaceProduct {
  return {
    productCode: `AGT-${randomUUID()}`,
    name: `Whitsundays Sunset Sail ${randomUUID()}`,
    description: "A relaxed sunset sail through the Whitsundays.",
    supplierName: "Whitsunday Sailing Co",
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
