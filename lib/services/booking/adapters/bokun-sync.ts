import crypto from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { decryptCredentials } from "./credentials";
import type { BokunCredentials } from "./bokun";

type BokunProductForSync = {
  id: string;
  internalName?: string;
  title?: string;
  description?: string;
  shortDescription?: string;
  timeZone?: string;
  locale?: string;
  available?: boolean;
  coverImageUrl?: string;
  imageUrl?: string;
  photos?: Array<string | { url?: string; originalUrl?: string; imageUrl?: string }>;
  images?: Array<string | { url?: string; originalUrl?: string; imageUrl?: string }>;
  media?: Array<string | { url?: string; originalUrl?: string; imageUrl?: string; type?: string }>;
  pricing?: {
    currency?: string;
    retail?: number;
    original?: number;
    net?: number;
  };
  unitPricingFrom?: Array<{
    retail?: number;
    original?: number;
    net?: number;
    currency?: string;
  }>;
};

export type BokunSyncResult = {
  synced: number;
  productIds: string[];
};

type ResolvedBokunSyncCredentials = {
  apiBase: string;
  accessToken: string;
  supplierId: string;
  publicBookingBaseUrl?: string;
  publicProductUrlTemplate?: string;
  restApiBase?: string;
  restAccessKey?: string;
  restSecretKey?: string;
};

type BokunPhotoComponents = {
  photos?: Array<{
    url?: string;
    originalUrl?: string;
    caption?: string;
    alternateText?: string;
  }>;
};

function normalizeApiBase(apiBase?: string) {
  return (apiBase || process.env.BOKUN_API_BASE || "https://api.bokun.io/octo/v1").replace(
    /\/$/,
    "",
  );
}

function resolveCredentials(credentials: BokunCredentials): ResolvedBokunSyncCredentials {
  const resolved = {
    apiBase: normalizeApiBase(credentials.apiBase),
    accessToken: credentials.accessToken || process.env.BOKUN_ACCESS_TOKEN || "",
    supplierId: credentials.supplierId || process.env.BOKUN_OCTO_SUPPLIER_ID || "",
    publicBookingBaseUrl: credentials.publicBookingBaseUrl,
    publicProductUrlTemplate: credentials.publicProductUrlTemplate,
    restApiBase: normalizeRestApiBase(credentials.restApiBase),
    restAccessKey: credentials.restAccessKey || process.env.BOKUN_REST_ACCESS_KEY,
    restSecretKey: credentials.restSecretKey || process.env.BOKUN_REST_SECRET_KEY,
  };

  if (!resolved.accessToken) {
    throw new Error("Bokun access token is not configured");
  }

  return resolved;
}

function normalizeRestApiBase(restApiBase?: string) {
  return (restApiBase || process.env.BOKUN_REST_API_BASE || "https://api.bokun.io").replace(
    /\/$/,
    "",
  );
}

async function bokunSyncRequest<T>(credentials: ResolvedBokunSyncCredentials, path: string) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${credentials.accessToken}`,
    "Octo-Capabilities": "pricing",
  };

  if (credentials.supplierId) {
    headers["Octo-Supplier-Id"] = credentials.supplierId;
  }

  const response = await fetch(`${credentials.apiBase}${path}`, { headers });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Bokun catalog sync failed (${response.status}): ${body}`);
  }

  return response.json() as Promise<T>;
}

function moneyToCents(value?: number) {
  return Math.round((value ?? 0) * 100);
}

function priceFromProduct(product: BokunProductForSync) {
  const productPrice = product.pricing?.retail ?? product.pricing?.original ?? product.pricing?.net;
  const unitPrice =
    product.unitPricingFrom?.[0]?.retail ??
    product.unitPricingFrom?.[0]?.original ??
    product.unitPricingFrom?.[0]?.net;

  return moneyToCents(productPrice ?? unitPrice);
}

function currencyFromProduct(product: BokunProductForSync) {
  return (
    product.pricing?.currency ??
    product.unitPricingFrom?.find((item) => item.currency)?.currency ??
    "USD"
  );
}

function locationFromProduct() {
  // OCTO currently exposes `timeZone`, not a traveller-facing destination.
  // Keep location empty unless Bokun gives us a real place field later.
  return null;
}

function imageUrlFromProduct(product: BokunProductForSync) {
  const candidates = [
    product.coverImageUrl,
    product.imageUrl,
    firstImageUrl(product.photos),
    firstImageUrl(product.images),
    firstImageUrl(product.media),
  ];

  return candidates.find((url) => url && /^https:\/\//i.test(url));
}

function bokunRestDate() {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

function bokunRestHeaders(
  credentials: ResolvedBokunSyncCredentials,
  method: "GET",
  path: string,
) {
  if (!credentials.restAccessKey || !credentials.restSecretKey) {
    return undefined;
  }

  const date = bokunRestDate();
  const signature = crypto
    .createHmac("sha1", credentials.restSecretKey)
    .update(`${date}${credentials.restAccessKey}${method}${path}`)
    .digest("base64");

  return {
    "X-Bokun-Date": date,
    "X-Bokun-AccessKey": credentials.restAccessKey,
    "X-Bokun-Signature": signature,
  };
}

async function bokunRestRequest<T>(
  credentials: ResolvedBokunSyncCredentials,
  path: string,
): Promise<T | undefined> {
  const headers = bokunRestHeaders(credentials, "GET", path);

  if (!headers) {
    return undefined;
  }

  const response = await fetch(`${credentials.restApiBase}${path}`, { headers });

  if (!response.ok) {
    const safeBody = (await response.text()).slice(0, 240);
    console.warn("bokun.rest_component_sync.failed", {
      status: response.status,
      path,
      bodyPreview: safeBody,
    });
    return undefined;
  }

  return response.json() as Promise<T>;
}

async function imageUrlFromBokunComponents(
  credentials: ResolvedBokunSyncCredentials,
  productId: string,
) {
  const path = `/restapi/v2.0/experience/${encodeURIComponent(
    productId,
  )}/components?componentType=PHOTOS`;
  const components = await bokunRestRequest<BokunPhotoComponents>(credentials, path);

  return firstImageUrl(components?.photos);
}

function firstImageUrl(
  values?: Array<string | { url?: string; originalUrl?: string; imageUrl?: string }>,
) {
  for (const value of values ?? []) {
    if (typeof value === "string") {
      return value;
    }

    const url = value.originalUrl ?? value.imageUrl ?? value.url;

    if (url) {
      return url;
    }
  }

  return undefined;
}

export async function validateBokunCredentials(credentials: BokunCredentials) {
  const resolved = resolveCredentials(credentials);
  await bokunSyncRequest<unknown>(resolved, "/products");
  return true;
}

export async function syncBokunCatalog(
  operatorId: string,
  credentials: BokunCredentials,
): Promise<BokunSyncResult> {
  const resolved = resolveCredentials(credentials);
  const products = await bokunSyncRequest<BokunProductForSync[]>(resolved, "/products");
  const syncableProducts = products.filter((product) => product.id && product.available !== false);
  const syncedIds: string[] = [];

  for (const product of syncableProducts) {
    const imageUrl =
      imageUrlFromProduct(product) ?? (await imageUrlFromBokunComponents(resolved, product.id));

    await prisma.trip.upsert({
      where: {
        operatorId_externalId: {
          operatorId,
          externalId: product.id,
        },
      },
      update: {
        title: product.title ?? product.internalName ?? "Bokun experience",
        description: product.description ?? product.shortDescription,
        location: locationFromProduct(),
        imageUrl,
        currency: currencyFromProduct(product),
        priceCents: priceFromProduct(product),
      },
      create: {
        operatorId,
        externalId: product.id,
        title: product.title ?? product.internalName ?? "Bokun experience",
        description: product.description ?? product.shortDescription,
        location: locationFromProduct(),
        imageUrl,
        currency: currencyFromProduct(product),
        priceCents: priceFromProduct(product),
      },
    });

    syncedIds.push(product.id);
  }

  return {
    synced: syncedIds.length,
    productIds: syncedIds,
  };
}

export async function syncAllBokunCatalogs(): Promise<BokunSyncResult> {
  const integrations = await prisma.operatorIntegration.findMany({
    where: { platform: "BOKUN" },
    select: { operatorId: true, encryptedCredentials: true },
  });
  const aggregate: BokunSyncResult = { synced: 0, productIds: [] };

  for (const integration of integrations) {
    const credentials = decryptCredentials<BokunCredentials>(integration.encryptedCredentials);
    const result = await syncBokunCatalog(integration.operatorId, credentials);
    aggregate.synced += result.synced;
    aggregate.productIds.push(...result.productIds);
  }

  return aggregate;
}

export function toBokunCredentialsPayload(input: BokunCredentials): Prisma.InputJsonObject {
  return {
    apiBase: input.apiBase ?? null,
    accessToken: input.accessToken ?? null,
    supplierId: input.supplierId ?? null,
    publicBookingBaseUrl: input.publicBookingBaseUrl ?? null,
    publicProductUrlTemplate: input.publicProductUrlTemplate ?? null,
    restApiBase: input.restApiBase ?? null,
    restAccessKey: input.restAccessKey ?? null,
    restSecretKey: input.restSecretKey ?? null,
  };
}
