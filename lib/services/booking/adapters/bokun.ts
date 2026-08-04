import crypto from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { assertTransition, type BookingStatus } from "../state-machine";
import { decryptCredentials } from "./credentials";
import type {
  AvailabilityInput,
  BookingAdapter,
  ConfirmInput,
  HoldInput,
  ReleaseHoldInput,
} from "./types";

export type BokunCredentials = {
  apiBase?: string;
  accessToken?: string;
  supplierId?: string;
  publicBookingBaseUrl?: string;
  publicProductUrlTemplate?: string;
  restApiBase?: string;
  restAccessKey?: string;
  restSecretKey?: string;
};

type ResolvedBokunCredentials = {
  apiBase: string;
  accessToken: string;
  supplierId: string;
  publicBookingBaseUrl?: string;
  publicProductUrlTemplate?: string;
  restApiBase?: string;
  restAccessKey?: string;
  restSecretKey?: string;
};

type OctoProduct = {
  id: string;
  internalName?: string;
  title?: string;
  description?: string;
  locale?: string;
  options?: Array<{
    id: string;
    default?: boolean;
    units?: Array<{ id: string; type?: string; internalName?: string }>;
  }>;
};

type OctoAvailability = {
  id?: string;
  available?: boolean;
  status?: string;
  vacancies?: number;
  utcCutoffAt?: string;
  pricing?: {
    retail?: number;
    original?: number;
    net?: number;
    currency?: string;
  };
  unitPricing?: Array<{
    unitId?: string;
    retail?: number;
    original?: number;
    net?: number;
    currency?: string;
  }>;
};

type AvailabilityResult = {
  available: boolean;
  priceCents: number;
  currency: string;
  holdable: boolean;
  availabilityId?: string;
  productId?: string;
  optionId?: string;
  unitId?: string;
};

type BokunWebhookPayload = {
  event?: string;
  type?: string;
  bookingId?: string;
  booking?: {
    id?: string;
    uuid?: string;
    status?: string;
  };
};

const availabilityCache = new Map<string, { expiresAt: number; value: AvailabilityResult }>();
const availabilityCacheTtlMs = 5 * 60 * 1000;
const octoCapabilities = "pricing";

function cacheKey(input: AvailabilityInput) {
  return [input.operatorId, input.tripId, input.startsAt, input.travellers].join(":");
}

function localDateFromStartsAt(startsAt: string) {
  return startsAt.slice(0, 10);
}

function normalizeApiBase(apiBase?: string) {
  return (apiBase || process.env.BOKUN_API_BASE || "https://api.bokun.io/octo/v1").replace(
    /\/$/,
    "",
  );
}

export async function getBokunCredentials(
  operatorId: string,
): Promise<ResolvedBokunCredentials> {
  const integration = await prisma.operatorIntegration.findUnique({
    where: {
      operatorId_platform: {
        operatorId,
        platform: "BOKUN",
      },
    },
    select: { encryptedCredentials: true },
  });

  const stored = integration
    ? decryptCredentials<BokunCredentials>(integration.encryptedCredentials)
    : {};

  const credentials = {
    apiBase: normalizeApiBase(stored.apiBase),
    accessToken: stored.accessToken || process.env.BOKUN_ACCESS_TOKEN || "",
    supplierId: stored.supplierId || process.env.BOKUN_OCTO_SUPPLIER_ID || "",
    publicBookingBaseUrl: stored.publicBookingBaseUrl,
    publicProductUrlTemplate: stored.publicProductUrlTemplate,
    restApiBase: stored.restApiBase || process.env.BOKUN_REST_API_BASE,
    restAccessKey: stored.restAccessKey || process.env.BOKUN_REST_ACCESS_KEY,
    restSecretKey: stored.restSecretKey || process.env.BOKUN_REST_SECRET_KEY,
  };

  if (!credentials.accessToken) {
    throw new Error("Bokun access token is not configured");
  }

  return credentials;
}

function bokunHeaders(credentials: ResolvedBokunCredentials) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${credentials.accessToken}`,
    "Content-Type": "application/json",
    "Octo-Capabilities": octoCapabilities,
  };

  if (credentials.supplierId) {
    headers["Octo-Supplier-Id"] = credentials.supplierId;
  }

  return headers;
}

async function bokunRequest<T>(
  credentials: ResolvedBokunCredentials,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${credentials.apiBase}${path}`, {
    ...init,
    headers: {
      ...bokunHeaders(credentials),
      ...init.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Bokun OCTO request failed (${response.status}): ${body}`);
  }

  return response.json() as Promise<T>;
}

function chooseDefaultOption(product: OctoProduct) {
  const option = product.options?.find((item) => item.default) ?? product.options?.[0];

  if (!option) {
    throw new Error(`Bokun product ${product.id} has no bookable option`);
  }

  return option;
}

function chooseTravellerUnit(option: NonNullable<OctoProduct["options"]>[number]) {
  const unit =
    option.units?.find((item) => item.type === "ADULT") ??
    option.units?.find((item) => item.type !== "INFANT") ??
    option.units?.[0];

  if (!unit) {
    throw new Error(`Bokun option ${option.id} has no bookable unit`);
  }

  return unit;
}

function moneyToCents(value?: number) {
  return Math.round((value ?? 0) * 100);
}

export function normalizeBokunAvailability(
  availability: OctoAvailability,
  travellers: number,
): Pick<AvailabilityResult, "available" | "priceCents" | "currency" | "holdable"> {
  const available =
    availability.available === true ||
    availability.status === "AVAILABLE" ||
    availability.status === "FREESALE" ||
    availability.status === "LIMITED";
  const hasCapacity =
    availability.vacancies === undefined || availability.vacancies === null
      ? true
      : availability.vacancies >= travellers;
  const pricing = availability.pricing;
  const unitPricingTotal = availability.unitPricing?.reduce(
    (total, item) => total + moneyToCents(item.retail ?? item.original ?? item.net),
    0,
  );
  const priceCents =
    pricing && (pricing.retail || pricing.original || pricing.net)
      ? moneyToCents(pricing.retail ?? pricing.original ?? pricing.net)
      : (unitPricingTotal ?? 0) * travellers;

  return {
    available: available && hasCapacity,
    priceCents,
    currency:
      pricing?.currency ??
      availability.unitPricing?.find((item) => item.currency)?.currency ??
      "USD",
    holdable: available && hasCapacity && Boolean(availability.id),
  };
}

async function getProductForTrip(input: AvailabilityInput) {
  const trip = await prisma.trip.findUniqueOrThrow({
    where: { id: input.tripId },
    select: { externalId: true, priceCents: true, currency: true },
  });

  if (!trip.externalId) {
    throw new Error(`Trip ${input.tripId} is missing a Bokun externalId`);
  }

  return trip;
}

async function resolveAvailability(input: AvailabilityInput): Promise<AvailabilityResult> {
  const key = cacheKey(input);
  const cached = availabilityCache.get(key);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const credentials = await getBokunCredentials(input.operatorId);
  const trip = await getProductForTrip(input);
  const product = await bokunRequest<OctoProduct>(credentials, `/products/${trip.externalId}`);
  const option = chooseDefaultOption(product);
  const unit = chooseTravellerUnit(option);
  const availability = await bokunRequest<OctoAvailability[]>(credentials, "/availability", {
    method: "POST",
    body: JSON.stringify({
      productId: product.id,
      optionId: option.id,
      localDate: localDateFromStartsAt(input.startsAt),
      units: [{ id: unit.id, quantity: input.travellers }],
      currency: trip.currency,
    }),
  });
  const matching =
    availability.find((item) => item.available || item.status === "AVAILABLE") ??
    availability[0] ??
    {};
  const normalized = normalizeBokunAvailability(matching, input.travellers);
  const value = {
    ...normalized,
    priceCents: normalized.priceCents || trip.priceCents * input.travellers,
    currency: normalized.currency || trip.currency,
    availabilityId: matching.id,
    productId: product.id,
    optionId: option.id,
    unitId: unit.id,
  };

  availabilityCache.set(key, { expiresAt: Date.now() + availabilityCacheTtlMs, value });

  return value;
}

function isValidSignature(headers: Headers, rawBody: string, secret: string) {
  const received =
    headers.get("x-bokun-signature") ??
    headers.get("x-octo-signature") ??
    headers.get("x-signature") ??
    "";
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const normalized = received.replace(/^sha256=/, "");

  if (!normalized) {
    return false;
  }

  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(normalized, "hex");

  return (
    expectedBuffer.length === receivedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}

export async function processBokunWebhook(rawBody: string) {
  const payload = JSON.parse(rawBody) as BokunWebhookPayload;
  const eventType = (payload.event ?? payload.type ?? "").toLowerCase();
  const externalBookingId = payload.booking?.uuid ?? payload.booking?.id ?? payload.bookingId;

  if (!externalBookingId) {
    return { ok: true, ignored: true };
  }

  const booking = await prisma.booking.findFirst({
    where: { pmsHoldId: externalBookingId, pmsPlatform: "BOKUN" },
    select: { id: true, status: true },
  });

  if (!booking) {
    return { ok: true, ignored: true };
  }

  const isCancelled =
    eventType.includes("cancel") || payload.booking?.status?.toUpperCase() === "CANCELLED";

  if (!isCancelled) {
    await prisma.bookingEvent.create({
      data: {
        bookingId: booking.id,
        fromStatus: booking.status as BookingStatus,
        toStatus: booking.status as BookingStatus,
        actorType: "SYSTEM",
        payload: payload as Prisma.InputJsonObject,
      },
    });

    return { ok: true, bookingId: booking.id, status: booking.status };
  }

  const fromStatus = booking.status as BookingStatus;
  assertTransition(fromStatus, "CANCELLED");

  await prisma.$transaction([
    prisma.booking.update({
      where: { id: booking.id },
      data: { status: "CANCELLED" },
    }),
    prisma.bookingEvent.create({
      data: {
        bookingId: booking.id,
        fromStatus,
        toStatus: "CANCELLED",
        actorType: "SYSTEM",
        payload: payload as Prisma.InputJsonObject,
      },
    }),
  ]);

  return { ok: true, bookingId: booking.id, status: "CANCELLED" };
}

export const bokunAdapter: BookingAdapter = {
  platform: "bokun",
  capabilities: {
    supportsHold: true,
    supportsCancellation: true,
    supportsLiveAvailability: true,
  },

  async checkAvailability(input) {
    const availability = await resolveAvailability(input);

    return {
      available: availability.available,
      priceCents: availability.priceCents,
      currency: availability.currency,
      holdable: availability.holdable,
    };
  },

  async placeHold(input: HoldInput) {
    const availability = await resolveAvailability(input);

    if (!availability.holdable || !availability.availabilityId) {
      throw new Error("Bokun availability is not holdable");
    }

    const credentials = await getBokunCredentials(input.operatorId);
    const traveller = await prisma.traveller.findUniqueOrThrow({
      where: { id: input.travellerId },
      select: { displayName: true, whatsappE164: true },
    });
    const idempotencyKey = crypto
      .createHash("sha256")
      .update(["bokun-hold", input.operatorId, input.tripId, input.startsAt, input.travellerId].join(":"))
      .digest("hex");
    const booking = await bokunRequest<{
      uuid?: string;
      id?: string;
      utc_expires_at?: string;
      utcExpiresAt?: string;
      expirationDate?: string;
    }>(credentials, "/bookings", {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: JSON.stringify({
        productId: availability.productId,
        optionId: availability.optionId,
        availabilityId: availability.availabilityId,
        expirationMinutes: 30,
        units: [{ id: availability.unitId, quantity: input.travellers }],
        contact: {
          fullName: traveller.displayName ?? "BluePass traveller",
          phoneNumber: traveller.whatsappE164,
        },
        resellerReference: input.travellerId,
      }),
    });
    const holdId = booking.uuid ?? booking.id;

    if (!holdId) {
      throw new Error("Bokun hold response did not include a booking id");
    }

    return {
      holdId,
      expiresAt:
        booking.utc_expires_at ??
        booking.utcExpiresAt ??
        booking.expirationDate ??
        new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };
  },

  async confirmBooking(input: ConfirmInput) {
    const booking = await prisma.booking.findUniqueOrThrow({
      where: { id: input.bookingId },
      select: { operatorId: true },
    });
    const credentials = await getBokunCredentials(booking.operatorId);
    const confirmed = await bokunRequest<{
      uuid?: string;
      id?: string;
      reference?: string;
      confirmationCode?: string;
    }>(credentials, `/bookings/${input.holdId}/confirm`, {
      method: "POST",
      headers: { "Idempotency-Key": `bokun-confirm-${input.bookingId}` },
    });

    return {
      bookingId: confirmed.uuid ?? confirmed.id ?? input.holdId,
      confirmationCode: confirmed.confirmationCode ?? confirmed.reference ?? input.holdId,
    };
  },

  async releaseHold(input: ReleaseHoldInput) {
    const booking = await prisma.booking.findFirstOrThrow({
      where: { pmsHoldId: input.holdId, pmsPlatform: "BOKUN" },
      select: { operatorId: true },
    });
    const credentials = await getBokunCredentials(booking.operatorId);

    await bokunRequest(credentials, `/bookings/${input.holdId}/cancel`, {
      method: "POST",
      body: JSON.stringify({ force: true }),
    });
  },

  verifyWebhook(headers: Headers, rawBody: string) {
    const secret = process.env.BOKUN_WEBHOOK_SECRET;

    if (!secret) {
      return false;
    }

    return isValidSignature(headers, rawBody, secret);
  },
};
