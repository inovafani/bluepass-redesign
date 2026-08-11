import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { normalizeSlug } from "@/lib/services/operators/operator-leads";

type FetchLike = typeof fetch;

export type RezdyMarketplaceProduct = {
  productCode: string;
  name: string;
  description: string;
  supplierName: string;
  supplierId: string;
  region: string;
  priceFrom: number | null;
  currency: string;
  imageUrl: string | null;
  productUrl: string | null;
};

export type RezdyAgentSyncEnv = Record<string, string | undefined> & {
  KAI_CORE_BASE_URL?: string;
  REZDY_AGENT_SYNC_TOKEN?: string;
};

/**
 * Pulls every Rezdy-connected operator's products through Kai's own Agent API credential (Kai
 * exposes this at GET /api/internal/rezdy-agent/marketplace-products - see that route and
 * RezdyAgentPmsAdapter.listMarketplaceProducts() in the Kai repo). Reuses KAI_CORE_BASE_URL, the
 * existing "how do we reach Kai" env var already used by lib/services/kai-core/client.ts, rather
 * than inventing a second one - only the auth token differs (REZDY_AGENT_SYNC_TOKEN, a header this
 * app sends to Kai, distinct from INTERNAL_SERVICE_TOKEN, which is what other services send to us).
 */
export async function fetchRezdyAgentMarketplaceProducts(
  env: RezdyAgentSyncEnv = process.env,
  fetchImpl: FetchLike = fetch,
): Promise<RezdyMarketplaceProduct[]> {
  const token = env.REZDY_AGENT_SYNC_TOKEN;
  if (!token) {
    throw new Error("REZDY_AGENT_SYNC_TOKEN is not configured.");
  }
  const baseUrl = (env.KAI_CORE_BASE_URL ?? "http://127.0.0.1:3107").replace(/\/$/, "");

  const response = await fetchImpl(`${baseUrl}/api/internal/rezdy-agent/marketplace-products`, {
    headers: { "x-kai-internal-token": token },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Kai marketplace-products request failed with status ${response.status}.`);
  }

  const body = (await response.json()) as { products?: unknown };
  return Array.isArray(body.products) ? (body.products as RezdyMarketplaceProduct[]) : [];
}

async function buildUniqueListingSlug(title: string) {
  const base = normalizeSlug(title) || "operator";

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const slug = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const existing = await prisma.operatorListing.findUnique({ where: { slug }, select: { id: true } });
    if (!existing) {
      return slug;
    }
  }

  return `${base}-${Date.now().toString(36)}`;
}

/**
 * Finds or auto-creates the BluePassAccount + OperatorProfile for a Rezdy-connected supplier who has
 * never signed up for BluePass directly. **Placeholder account**: synthetic email the real operator
 * doesn't know, unusable random passwordHash - they can't log in yet. This is a deliberate,
 * user-approved trade-off (2026-08-06): publish the listing immediately rather than wait for a
 * manual claim, at the cost of the real business not yet having a way to access the account BluePass
 * created for them. Bridging that gap (a real claim flow for these placeholder profiles) is an open
 * follow-up, not solved here - flag it, don't silently pretend it's handled.
 *
 * Dedupe key is rezdySupplierId, not kaiTenantSlug - a Rezdy marketplace supplier has no Kai
 * Tenant/booking flow of its own (that's a separate concept, used only by tenants like Boattime that
 * actually have bookings flowing through Kai).
 */
async function findOrCreateOperatorProfileForSupplier(product: RezdyMarketplaceProduct) {
  const existing = await prisma.operatorProfile.findUnique({ where: { rezdySupplierId: product.supplierId } });
  if (existing) {
    return existing;
  }

  const account = await prisma.bluePassAccount.create({
    data: {
      email: `rezdy+${product.supplierId}@ops.bluepass.co`,
      passwordHash: randomBytes(32).toString("hex"),
      displayName: product.supplierName || null,
      roles: ["OPERATOR"],
    },
  });

  return prisma.operatorProfile.create({
    data: {
      accountId: account.id,
      rezdySupplierId: product.supplierId,
      companyName: product.supplierName || null,
      status: "LIVE",
      country: "AU",
      notes: `Auto-created by the Rezdy Agent API Discover sync on ${new Date().toISOString().slice(0, 10)}.`,
    },
  });
}

// Rezdy's marketplace product listing has no category concept in the mapping Kai exposes - default
// to a generic bucket until a human corrects it via the normal listing-edit flow (the same one
// operator-listing-service.ts's createDraftListing/updateDraftListing already provide).
const DEFAULT_REZDY_LISTING_CATEGORY = "Tour";

async function upsertListingForProduct(operatorProfileId: string, product: RezdyMarketplaceProduct) {
  const existing = await prisma.operatorListing.findFirst({
    where: { operatorProfileId, title: product.name },
  });

  const data = {
    category: DEFAULT_REZDY_LISTING_CATEGORY,
    region: product.region || "Australia",
    description: product.description || product.name,
    heroImageUrl: product.imageUrl,
    priceSignal: product.priceFrom != null ? `From ${product.currency} ${product.priceFrom}` : null,
    // Real number backing priceSignal's display string - see the schema field's own comment for why
    // this exists separately (the Discover page needs a real number, priceSignal is free text).
    priceFrom: product.priceFrom,
    currency: product.currency || "AUD",
  };

  if (existing) {
    return prisma.operatorListing.update({
      where: { id: existing.id },
      data,
    });
  }

  const slug = await buildUniqueListingSlug(product.name);

  return prisma.operatorListing.create({
    data: {
      operatorProfileId,
      slug,
      title: product.name,
      status: "LIVE",
      publishedAt: new Date(),
      ...data,
    },
  });
}

export type RezdyAgentSyncResult = {
  productsSeen: number;
  operatorsCreated: number;
  listingsCreated: number;
  listingsUpdated: number;
};

/** The pure-ish orchestration step: given already-fetched products, upsert accounts/profiles/listings. */
export async function syncRezdyAgentMarketplaceProducts(
  products: RezdyMarketplaceProduct[],
): Promise<RezdyAgentSyncResult> {
  const result: RezdyAgentSyncResult = { productsSeen: 0, operatorsCreated: 0, listingsCreated: 0, listingsUpdated: 0 };

  for (const product of products) {
    if (!product.supplierId || !product.name) {
      continue;
    }
    result.productsSeen += 1;

    const profileBefore = await prisma.operatorProfile.findUnique({
      where: { rezdySupplierId: product.supplierId },
      select: { id: true },
    });
    const profile = await findOrCreateOperatorProfileForSupplier(product);
    if (!profileBefore) {
      result.operatorsCreated += 1;
    }

    const listingBefore = await prisma.operatorListing.findFirst({
      where: { operatorProfileId: profile.id, title: product.name },
      select: { id: true },
    });
    await upsertListingForProduct(profile.id, product);
    if (listingBefore) {
      result.listingsUpdated += 1;
    } else {
      result.listingsCreated += 1;
    }
  }

  return result;
}

/** The full live pipeline: fetch from Kai, then sync. Thin - the cron route calls this directly. */
export async function runRezdyAgentDiscoverSync(
  env: RezdyAgentSyncEnv = process.env,
  fetchImpl: FetchLike = fetch,
): Promise<RezdyAgentSyncResult> {
  const products = await fetchRezdyAgentMarketplaceProducts(env, fetchImpl);
  return syncRezdyAgentMarketplaceProducts(products);
}
