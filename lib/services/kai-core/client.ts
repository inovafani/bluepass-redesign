import type { ReferralAttribution } from "@/lib/services/referrals/attribution";
import { prisma } from "@/lib/db/prisma";
import { yachts } from "@/lib/data/yachts";
import { detectKaiRegion, KAI_REGION_CLARIFYING_QUESTION, type KaiRegion } from "./region-router";

type FetchLike = typeof fetch;

export type KaiCoreClientEnv = Record<string, string | undefined> & {
  KAI_CORE_ENABLED?: string;
  KAI_CORE_BASE_URL?: string;
  KAI_CORE_WIDGET_KEY?: string;
  KAI_CORE_WIDGET_KEY_AU?: string;
  KAI_CORE_ORIGIN?: string;
  KAI_CORE_ADMIN_TOKEN?: string;
};

export type KaiCoreWebChatInput = {
  sessionId?: string;
  message: string;
  region?: KaiRegion;
  travellerAccountId?: string;
  referralAttribution?: ReferralAttribution;
};

type KaiCoreSessionResponse = {
  conversation?: {
    id?: string;
    updatedAt?: string;
  };
  resumed?: boolean;
  messages?: Array<{ role: "traveller" | "assistant"; content: string }>;
};

export type KaiCoreResumedSession = {
  conversationId: string;
  resumed: boolean;
  region: KaiRegion;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
};

type KaiCoreMessageResponse = {
  assistantMessage?: {
    content?: string;
  };
  bluepassMatches?: KaiCoreBluePassMatch[];
  productCards?: KaiCoreProductCard[] | null;
  contactRequest?: KaiCoreContactRequest | null;
  paymentRequest?: KaiCorePaymentRequest | null;
};

// kai-conversation-flow-notes.md item 9: the AU/Boattime equivalent of KaiCoreBluePassMatch - the
// generic-booking-flow branch of Kai Core's /api/widget/messages attaches this instead of
// bluepassMatches (BookingProductCard on the Kai side). No image/tier/region/cabins - Boattime
// products carry none of that.
type KaiCoreProductCard = {
  slug: string;
  title: string;
  description: string;
  productUrl?: string | null;
  priceLabel?: string | null;
  dateChecked?: boolean;
};

export type KaiCorePaymentRequest = {
  conversationId: string;
  productTitle: string | null;
  dateText: string | null;
  guests: number | null;
  checkoutUrl: string | null;
  status: "PAYMENT_PENDING";
};

export type KaiCoreWidgetCapabilities = {
  enabledFeatures: string[];
};

export type KaiCorePaymentIntent = {
  provider: "REZDYPAY_STRIPE";
  publishableKey: string;
  conversationId: string;
};

export type KaiCorePaymentConfirmation = {
  status: "CONFIRMED";
  externalBookingId: string;
  provider: string;
};

type KaiCoreBluePassMatch = {
  slug: string;
  name: string;
  region: string;
  tier?: string;
  maxGuests?: number;
  cabins?: number;
  priceSignal?: string;
  charterPriceSignal?: string | null;
  reasons?: string[];
  score?: number;
  productUrl?: string | null;
  imageUrl?: string | null;
};

type KaiCoreContactRequest = {
  conversationId: string;
  fields: ["name", "email", "phone"];
  status: "CONTACT_DETAILS_REQUIRED";
};

type KaiCoreBluePassInquiryResponse = {
  id: string;
  status: string;
  travellerName?: string | null;
  travellerEmail?: string | null;
  travellerPhone?: string | null;
  destination?: string | null;
  dateWindow?: string | null;
  guests?: number | null;
  budget?: string | null;
  selectedYachtName?: string | null;
  operatorName?: string | null;
  createdAt: string;
  events?: KaiCoreBluePassInquiryEventResponse[];
  dispatches?: KaiCoreBluePassInquiryDispatchResponse[];
  tenant?: { slug: string; name: string };
};

type KaiCoreBluePassInquiryEventResponse = {
  id: string;
  type: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
};

type KaiCoreBluePassInquiryDispatchResponse = {
  id: string;
  status: string;
  operatorPhone?: string | null;
  createdAt: string;
};

type KaiCoreBluePassQuoteResponse = {
  id: string;
  inquiryId: string;
  status: "NEEDS_FINAL_PRICE" | "READY_FOR_TRAVELLER" | "TRAVELLER_APPROVED";
  operationalStatus?:
    | "NEEDS_FINAL_PRICE"
    | "READY_FOR_TRAVELLER"
    | "TRAVELLER_APPROVED"
    | "PAYMENT_READY"
    | "PAID"
    | "BOOKING_CONFIRMED";
  selectedYachtName: string | null;
  operatorName: string | null;
  destination: string | null;
  dateWindow: string | null;
  guests: number | null;
  currency: string;
  grossPriceCents: number | null;
  conservationContributionCents: number | null;
  inclusions: string | null;
  exclusions: string | null;
  terms: string | null;
  paymentText?: string | null;
  confirmationText?: string | null;
  source: "operator_accept" | "operator_counter";
  quoteUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type KaiCoreBluePassInquiry = {
  source: "kai-core";
  id: string;
  status: string;
  travellerName: string | null;
  travellerEmail: string | null;
  travellerPhone: string | null;
  destination: string | null;
  dateWindow: string | null;
  guests: number | null;
  budget: string | null;
  selectedYachtName: string | null;
  operatorName: string | null;
  createdAt: string;
  latestDispatchStatus: string | null;
  latestOperatorPhone: string | null;
  events: Array<{
    id: string;
    type: string;
    fromStatus: string | null;
    toStatus: string | null;
    payload: Record<string, unknown> | null;
    createdAt: string;
  }>;
};

export type KaiCoreBluePassQuote = KaiCoreBluePassQuoteResponse;

export type KaiCoreWebChatResult = {
  reply: string;
  sessionId?: string;
  region?: KaiRegion;
  matches?: (ReturnType<typeof toBluePassChatMatch> | ReturnType<typeof toProductCardMatch>)[];
  contactRequest?: KaiCoreContactRequest | null;
  paymentRequest?: KaiCorePaymentRequest | null;
};

export async function handleKaiCoreWebChat(
  input: KaiCoreWebChatInput,
  env: KaiCoreClientEnv = process.env,
  fetchImpl: FetchLike = fetch,
): Promise<KaiCoreWebChatResult> {
  // Region decides which Kai Core tenant (Indonesia's native marketplace vs the Australia Rezdy
  // pilot) this conversation talks to. Once a conversation has a sessionId, its region is normally
  // already locked in and passed back by the caller - only a brand-new conversation needs
  // detection. Ambiguous first messages get a cheap, deterministic clarifying question with no Kai
  // Core call at all, rather than guessing.
  let region = input.region;
  let effectiveSessionId = input.sessionId;

  if (!region) {
    if (input.sessionId) {
      // A sessionId with no cached region only happens for conversations that started before
      // region-routing existed (or otherwise lost their cached region) - forcing these onto
      // Indonesia forever regardless of what the traveller says next is a real bug, not a safe
      // default (a stale pre-existing session could sit on this path indefinitely). If the current
      // message is an unambiguous Australia signal, treat it as a fresh start under the right
      // tenant rather than silently continuing the old conversation.
      const detected = detectKaiRegion(input.message);
      if (detected === "australia") {
        region = "australia";
        effectiveSessionId = undefined;
      } else {
        region = "indonesia";
      }
    } else {
      const detected = detectKaiRegion(input.message);
      if (detected === "ambiguous") {
        return { reply: KAI_REGION_CLARIFYING_QUESTION };
      }
      region = detected;
    }
  }

  const config = resolveKaiCoreConfig(env, region);
  const conversationId =
    effectiveSessionId ??
    (await createKaiCoreSession({
      config,
      fetchImpl,
      travellerAccountId: input.travellerAccountId,
    }));
  const payload = {
    key: config.widgetKey,
    conversationId,
    content: input.message,
    bluepassCatalog: await buildBluePassCatalogSnapshot(),
    ...(input.referralAttribution
      ? {
          referral: {
            referralCode: input.referralAttribution.code,
            referralLinkId: input.referralAttribution.referralLinkId,
            referralPartnerId: input.referralAttribution.referralPartnerId,
            referralRole: input.referralAttribution.role,
          },
        }
      : {}),
  };

  const response = await fetchKaiCoreWithRetry(fetchImpl, `${config.baseUrl}/api/widget/messages`, {
    method: "POST",
    headers: buildKaiCoreHeaders(config),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Kai Core message request failed.");
  }

  const data = (await response.json()) as KaiCoreMessageResponse;

  return {
    sessionId: conversationId,
    region,
    reply: data.assistantMessage?.content ?? "Kai Core did not return a reply.",
    ...(data.contactRequest ? { contactRequest: data.contactRequest } : {}),
    ...(data.paymentRequest ? { paymentRequest: data.paymentRequest } : {}),
    ...(data.bluepassMatches && data.bluepassMatches.length > 0
      ? { matches: data.bluepassMatches.map(toBluePassChatMatch) }
      : data.productCards && data.productCards.length > 0
        ? { matches: data.productCards.map(toProductCardMatch) }
        : {}),
  };
}

function toProductCardMatch(card: KaiCoreProductCard) {
  return {
    slug: card.slug,
    name: card.title,
    matchingReasons: [] as string[],
    productUrl: card.productUrl ?? null,
    priceLabel: card.priceLabel ?? null,
    dateChecked: card.dateChecked ?? false,
  };
}

export function shouldUseKaiCore(env: KaiCoreClientEnv = process.env) {
  return env.KAI_CORE_ENABLED === "true";
}

export async function createKaiCorePaymentIntent(
  input: { conversationId: string; region?: KaiRegion },
  env: KaiCoreClientEnv = process.env,
  fetchImpl: FetchLike = fetch,
): Promise<KaiCorePaymentIntent> {
  const config = resolveKaiCoreConfig(env, input.region);
  const response = await fetchKaiCoreWithRetry(fetchImpl, `${config.baseUrl}/api/widget/payments/intent`, {
    method: "POST",
    headers: buildKaiCoreHeaders(config),
    body: JSON.stringify({ key: config.widgetKey, conversationId: input.conversationId }),
  });

  if (!response.ok) {
    throw new Error("Kai Core payment intent request failed.");
  }

  return (await response.json()) as KaiCorePaymentIntent;
}

export async function confirmKaiCorePayment(
  input: { conversationId: string; cardToken: string; region?: KaiRegion },
  env: KaiCoreClientEnv = process.env,
  fetchImpl: FetchLike = fetch,
): Promise<KaiCorePaymentConfirmation> {
  const config = resolveKaiCoreConfig(env, input.region);
  const response = await fetchKaiCoreWithRetry(fetchImpl, `${config.baseUrl}/api/widget/payments/confirm`, {
    method: "POST",
    headers: buildKaiCoreHeaders(config),
    body: JSON.stringify({
      key: config.widgetKey,
      conversationId: input.conversationId,
      cardToken: input.cardToken,
    }),
  });

  if (!response.ok) {
    throw new Error("Kai Core payment confirmation request failed.");
  }

  return (await response.json()) as KaiCorePaymentConfirmation;
}

// Tenant-scoped capability flags (e.g. whether a direct-PMS booking's payment step should redirect
// to a real BluePass-Stripe checkout instead of the embedded RezdyPay card form) live on Kai Core's
// own TenantConfig, exposed read-only via its widget-config endpoint. Only meaningful for the
// Australia region today (Indonesia's tenant never produces a paymentRequest at all).
export async function getKaiCoreWidgetCapabilities(
  input: { region?: KaiRegion } = {},
  env: KaiCoreClientEnv = process.env,
  fetchImpl: FetchLike = fetch,
): Promise<KaiCoreWidgetCapabilities> {
  const config = resolveKaiCoreConfig(env, input.region);
  const response = await fetchKaiCoreWithRetry(
    fetchImpl,
    `${config.baseUrl}/api/widget/config?key=${encodeURIComponent(config.widgetKey)}`,
    {
      method: "GET",
      headers: buildKaiCoreHeaders(config),
    },
  );

  if (!response.ok) {
    throw new Error("Kai Core widget config request failed.");
  }

  const data = (await response.json()) as { capabilities?: { enabledFeatures?: string[] } };

  return { enabledFeatures: data.capabilities?.enabledFeatures ?? [] };
}

export async function forwardWhatsAppWebhookToKaiCore(
  payload: unknown,
  env: KaiCoreClientEnv = process.env,
  fetchImpl: FetchLike = fetch,
) {
  if (!shouldUseKaiCore(env)) {
    return false;
  }

  const config = resolveKaiCoreConfig(env);
  const response = await fetchKaiCoreWithRetry(fetchImpl, `${config.baseUrl}/api/whatsapp/webhook`, {
    method: "POST",
    headers: buildKaiCoreHeaders(config),
    body: JSON.stringify(payload),
  });

  return response.ok;
}

export async function listKaiCoreBluePassInquiries(
  input: { tenantSlug: string; take?: number },
  env: KaiCoreClientEnv = process.env,
  fetchImpl: FetchLike = fetch,
): Promise<KaiCoreBluePassInquiry[]> {
  const config = resolveKaiCoreConfig(env);
  const adminToken = env.KAI_CORE_ADMIN_TOKEN?.trim();

  if (!adminToken) {
    throw new Error("Kai Core admin token is not configured.");
  }

  const params = new URLSearchParams({ take: String(input.take ?? 40) });
  const response = await fetchKaiCoreWithRetry(
    fetchImpl,
    `${config.baseUrl}/api/admin/${encodeURIComponent(input.tenantSlug)}/bluepass-inquiries?${params.toString()}`,
    {
      method: "GET",
      headers: {
        ...buildKaiCoreHeaders(config),
        authorization: `Bearer ${adminToken}`,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error("Kai Core BluePass inquiries request failed.");
  }

  const data = (await response.json()) as { inquiries?: KaiCoreBluePassInquiryResponse[] };
  return (data.inquiries ?? []).map(toKaiCoreBluePassInquiry);
}

export type KaiCoreBluePassLedgerEntry = {
  id: string;
  kind: string;
  amountCents: number;
  currency: string;
  status: "PENDING" | "FINALIZED" | "VOIDED";
  paidOutAt: string | null;
  paidOutReference: string | null;
  paidOutBy: string | null;
  createdAt: string;
  inquiry: {
    id: string;
    selectedYachtName: string | null;
    operatorName: string | null;
    operatorPhone: string | null;
    destination: string | null;
    status: string;
  } | null;
};

type KaiCoreBluePassLedgerEntryResponse = Omit<KaiCoreBluePassLedgerEntry, "inquiry"> & {
  inquiry?: KaiCoreBluePassLedgerEntry["inquiry"];
};

export async function listKaiCoreBluePassLedger(
  input: { tenantSlug: string; status?: "PENDING" | "FINALIZED" | "VOIDED"; take?: number },
  env: KaiCoreClientEnv = process.env,
  fetchImpl: FetchLike = fetch,
): Promise<KaiCoreBluePassLedgerEntry[]> {
  const config = resolveKaiCoreConfig(env);
  const adminToken = env.KAI_CORE_ADMIN_TOKEN?.trim();

  if (!adminToken) {
    throw new Error("Kai Core admin token is not configured.");
  }

  const params = new URLSearchParams({ take: String(input.take ?? 100) });
  if (input.status) {
    params.set("status", input.status);
  }

  const response = await fetchKaiCoreWithRetry(
    fetchImpl,
    `${config.baseUrl}/api/admin/${encodeURIComponent(input.tenantSlug)}/bluepass-ledger?${params.toString()}`,
    {
      method: "GET",
      headers: {
        ...buildKaiCoreHeaders(config),
        authorization: `Bearer ${adminToken}`,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error("Kai Core BluePass ledger request failed.");
  }

  const data = (await response.json()) as { entries?: KaiCoreBluePassLedgerEntryResponse[] };
  return (data.entries ?? []).map((entry) => ({ ...entry, inquiry: entry.inquiry ?? null }));
}

export async function markKaiCoreBluePassLedgerEntryPaid(
  input: { tenantSlug: string; entryId: string; paidOutReference: string; reviewerEmail: string },
  env: KaiCoreClientEnv = process.env,
  fetchImpl: FetchLike = fetch,
): Promise<KaiCoreBluePassLedgerEntry> {
  const config = resolveKaiCoreConfig(env);
  const adminToken = env.KAI_CORE_ADMIN_TOKEN?.trim();

  if (!adminToken) {
    throw new Error("Kai Core admin token is not configured.");
  }

  const response = await fetchKaiCoreWithRetry(
    fetchImpl,
    `${config.baseUrl}/api/admin/${encodeURIComponent(input.tenantSlug)}/bluepass-ledger/${encodeURIComponent(input.entryId)}/mark-paid`,
    {
      method: "POST",
      headers: {
        ...buildKaiCoreHeaders(config),
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        paidOutReference: input.paidOutReference,
        reviewerEmail: input.reviewerEmail,
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(errorBody?.error?.message ?? "Kai Core BluePass ledger mark-paid request failed.");
  }

  const data = (await response.json()) as { entry: KaiCoreBluePassLedgerEntryResponse };
  return { ...data.entry, inquiry: data.entry.inquiry ?? null };
}

export async function releaseKaiCoreBluePassLedgerEntryPayoutViaStripe(
  input: { tenantSlug: string; entryId: string; stripeConnectAccountId: string; reviewerEmail: string },
  env: KaiCoreClientEnv = process.env,
  fetchImpl: FetchLike = fetch,
): Promise<KaiCoreBluePassLedgerEntry> {
  const config = resolveKaiCoreConfig(env);
  const adminToken = env.KAI_CORE_ADMIN_TOKEN?.trim();

  if (!adminToken) {
    throw new Error("Kai Core admin token is not configured.");
  }

  const response = await fetchKaiCoreWithRetry(
    fetchImpl,
    `${config.baseUrl}/api/admin/${encodeURIComponent(input.tenantSlug)}/bluepass-ledger/${encodeURIComponent(input.entryId)}/mark-paid`,
    {
      method: "POST",
      headers: {
        ...buildKaiCoreHeaders(config),
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        stripeConnectAccountId: input.stripeConnectAccountId,
        reviewerEmail: input.reviewerEmail,
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(errorBody?.error?.message ?? "Kai Core BluePass ledger Stripe release request failed.");
  }

  const data = (await response.json()) as { entry: KaiCoreBluePassLedgerEntryResponse };
  return { ...data.entry, inquiry: data.entry.inquiry ?? null };
}

export async function createKaiCoreOperatorStripeConnectAccount(
  input: { existingStripeAccountId?: string | null },
  env: KaiCoreClientEnv = process.env,
  fetchImpl: FetchLike = fetch,
): Promise<{ stripeAccountId: string; onboardingUrl: string }> {
  const config = resolveKaiCoreConfig(env);
  const adminToken = env.KAI_CORE_ADMIN_TOKEN?.trim();

  if (!adminToken) {
    throw new Error("Kai Core admin token is not configured.");
  }

  const response = await fetchKaiCoreWithRetry(
    fetchImpl,
    `${config.baseUrl}/api/admin/stripe/connect-accounts`,
    {
      method: "POST",
      headers: {
        ...buildKaiCoreHeaders(config),
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ existingStripeAccountId: input.existingStripeAccountId ?? null }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(errorBody?.error?.message ?? "Kai Core Stripe Connect account request failed.");
  }

  return (await response.json()) as { stripeAccountId: string; onboardingUrl: string };
}

export async function getKaiCoreBluePassQuote(
  input: { quoteId: string },
  env: KaiCoreClientEnv = process.env,
  fetchImpl: FetchLike = fetch,
): Promise<KaiCoreBluePassQuote | null> {
  const config = resolveKaiCoreConfig(env);
  const response = await fetchKaiCoreWithRetry(
    fetchImpl,
    `${config.baseUrl}/api/bluepass/quotes/${encodeURIComponent(input.quoteId)}`,
    {
      method: "GET",
      headers: buildKaiCoreHeaders(config),
      cache: "no-store",
    },
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Kai Core BluePass quote request failed.");
  }

  const data = (await response.json()) as { quote?: KaiCoreBluePassQuoteResponse };
  return data.quote ?? null;
}

export async function approveKaiCoreBluePassQuote(
  input: { quoteId: string },
  env: KaiCoreClientEnv = process.env,
  fetchImpl: FetchLike = fetch,
): Promise<KaiCoreBluePassQuote> {
  const config = resolveKaiCoreConfig(env);
  const response = await fetchKaiCoreWithRetry(
    fetchImpl,
    `${config.baseUrl}/api/bluepass/quotes/${encodeURIComponent(input.quoteId)}`,
    {
      method: "POST",
      headers: buildKaiCoreHeaders(config),
      body: JSON.stringify({ action: "approve" }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error("Kai Core BluePass quote approval failed.");
  }

  const data = (await response.json()) as { quote?: KaiCoreBluePassQuoteResponse };
  if (!data.quote) {
    throw new Error("Kai Core quote approval response did not include a quote.");
  }

  return data.quote;
}

export async function createKaiCoreBluePassCheckoutSession(
  input: { quoteId: string },
  env: KaiCoreClientEnv = process.env,
  fetchImpl: FetchLike = fetch,
): Promise<{ checkoutUrl: string }> {
  const config = resolveKaiCoreConfig(env);
  const response = await fetchKaiCoreWithRetry(
    fetchImpl,
    `${config.baseUrl}/api/bluepass/quotes/${encodeURIComponent(input.quoteId)}`,
    {
      method: "POST",
      headers: buildKaiCoreHeaders(config),
      body: JSON.stringify({ action: "checkout" }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(errorBody?.error?.message ?? "Kai Core BluePass checkout session request failed.");
  }

  const data = (await response.json()) as { checkoutUrl?: string };
  if (!data.checkoutUrl) {
    throw new Error("Kai Core checkout response did not include a checkout URL.");
  }

  return { checkoutUrl: data.checkoutUrl };
}

async function createKaiCoreSession(input: {
  config: ReturnType<typeof resolveKaiCoreConfig>;
  fetchImpl: FetchLike;
  travellerAccountId?: string;
}) {
  // Passing travellerAccountId here (resume-or-create, not resume-only) means even a logged-in
  // traveller's very first-ever message - which is what decides their region - still gets tagged
  // to their account at creation time, so it's resumable later regardless of which tenant it
  // landed in.
  const response = await fetchKaiCoreWithRetry(input.fetchImpl, `${input.config.baseUrl}/api/widget/session`, {
    method: "POST",
    headers: buildKaiCoreHeaders(input.config),
    body: JSON.stringify({
      key: input.config.widgetKey,
      ...(input.travellerAccountId ? { travellerId: input.travellerAccountId } : {}),
    }),
  });

  if (!response.ok) {
    throw new Error("Kai Core session request failed.");
  }

  const data = (await response.json()) as KaiCoreSessionResponse;
  const conversationId = data.conversation?.id;

  if (!conversationId) {
    throw new Error("Kai Core session response did not include a conversation id.");
  }

  return conversationId;
}

// Lets a logged-in traveller's Kai memory follow their account rather than one browser's local
// storage. Checks every region's tenant in parallel with resumeOnly (so merely checking never
// creates an empty conversation in a tenant the traveller has never actually talked to), and
// resumes whichever existing conversation was most recently active. Returns null when the
// traveller has no existing conversation in any tenant yet - callers should fall back to the
// normal first-message flow, which tags a fresh conversation to the account as soon as region is
// known.
export async function resumeKaiCoreSession(
  input: { travellerAccountId: string },
  env: KaiCoreClientEnv = process.env,
  fetchImpl: FetchLike = fetch,
): Promise<KaiCoreResumedSession | null> {
  const regions: KaiRegion[] = ["indonesia", "australia"];

  const attempts = await Promise.all(
    regions.map(async (region) => {
      const config = resolveKaiCoreConfig(env, region);

      try {
        const response = await fetchKaiCoreWithRetry(fetchImpl, `${config.baseUrl}/api/widget/session`, {
          method: "POST",
          headers: buildKaiCoreHeaders(config),
          body: JSON.stringify({
            key: config.widgetKey,
            travellerId: input.travellerAccountId,
            resumeOnly: true,
          }),
        });

        if (!response.ok) return null;

        const data = (await response.json()) as KaiCoreSessionResponse;
        if (!data.resumed || !data.conversation?.id) return null;

        return {
          conversationId: data.conversation.id,
          region,
          updatedAt: data.conversation.updatedAt ?? "",
          messages: (data.messages ?? []).map((message) => ({
            role: message.role === "traveller" ? ("user" as const) : ("assistant" as const),
            content: message.content,
          })),
        };
      } catch {
        return null;
      }
    }),
  );

  const found = attempts.filter((attempt): attempt is NonNullable<typeof attempt> => attempt !== null);
  if (found.length === 0) return null;

  found.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const best = found[0];

  return {
    conversationId: best.conversationId,
    resumed: true,
    region: best.region,
    messages: best.messages,
  };
}

function resolveKaiCoreConfig(env: KaiCoreClientEnv, region: KaiRegion = "indonesia") {
  return {
    baseUrl: (env.KAI_CORE_BASE_URL ?? "http://127.0.0.1:3107").replace(/\/$/, ""),
    widgetKey:
      region === "australia"
        ? (env.KAI_CORE_WIDGET_KEY_AU ?? "pk_test_bluepass_au")
        : (env.KAI_CORE_WIDGET_KEY ?? "pk_test_bluepass"),
    origin: env.KAI_CORE_ORIGIN ?? "https://bluepass.co",
  };
}

function buildKaiCoreHeaders(config: ReturnType<typeof resolveKaiCoreConfig>) {
  return {
    "Content-Type": "application/json",
    origin: config.origin,
  };
}

async function fetchKaiCoreWithRetry(fetchImpl: FetchLike, url: string, init: RequestInit) {
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetchImpl(url, init);
      if (response.ok || response.status < 500) {
        return response;
      }
      lastError = new Error(`Kai Core returned ${response.status}.`);
    } catch (error) {
      lastError = error;
    }

    if (attempt === 0) {
      await delay(250);
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }

  throw new Error("Kai Core request failed.");
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toBluePassChatMatch(match: KaiCoreBluePassMatch) {
  return {
    slug: match.slug,
    name: match.name,
    region: match.region,
    tier: match.tier ?? "",
    cabinBookable: Boolean(match.priceSignal && !/private/i.test(match.priceSignal)),
    maxGuests: match.maxGuests ?? 0,
    cabins: match.cabins ?? 0,
    pricePerCabin: match.priceSignal ?? "Quote on request",
    charterPrice: match.charterPriceSignal ?? null,
    charterOnly: Boolean(match.charterPriceSignal === null),
    matchingReasons: match.reasons ?? [],
    departuresPreview: [],
    score: match.score ?? 0,
    productUrl: match.productUrl ?? `/yachts/${match.slug}`,
    heroImageUrl: match.imageUrl ?? undefined,
  };
}

function toKaiCoreBluePassInquiry(inquiry: KaiCoreBluePassInquiryResponse): KaiCoreBluePassInquiry {
  const latestDispatch = inquiry.dispatches?.[0] ?? null;

  return {
    source: "kai-core",
    id: inquiry.id,
    status: inquiry.status,
    travellerName: inquiry.travellerName ?? null,
    travellerEmail: inquiry.travellerEmail ?? null,
    travellerPhone: inquiry.travellerPhone ?? null,
    destination: inquiry.destination ?? null,
    dateWindow: inquiry.dateWindow ?? null,
    guests: inquiry.guests ?? null,
    budget: inquiry.budget ?? null,
    selectedYachtName: inquiry.selectedYachtName ?? null,
    operatorName: inquiry.operatorName ?? null,
    createdAt: inquiry.createdAt,
    latestDispatchStatus: latestDispatch?.status ?? null,
    latestOperatorPhone: latestDispatch?.operatorPhone ?? null,
    events: (inquiry.events ?? []).map((event) => ({
      id: event.id,
      type: event.type,
      fromStatus: event.fromStatus ?? null,
      toStatus: event.toStatus ?? null,
      payload: event.metadata ?? null,
      createdAt: event.createdAt,
    })),
  };
}

export async function buildBluePassCatalogSnapshot() {
  const staticSnapshot = yachts.map((yacht) => ({
    slug: yacht.slug,
    name: yacht.name,
    region: yacht.region,
    tier: yacht.tier,
    maxGuests: yacht.maxGuests,
    cabins: yacht.cabins,
    priceSignal: formatPriceSignal(yacht.pricePerCabin, "per cabin"),
    charterPriceSignal: yacht.charterPrice ? formatPriceSignal(yacht.charterPrice, "private charter") : null,
    operatorId: `operator_${yacht.slug.replace(/-/g, "_")}`,
    operatorName: yacht.name,
    cabinBookable: yacht.cabinBookable,
    about: yacht.about,
    productUrl: buildBluePassProductUrl(yacht.slug),
    imageUrl: yacht.images.card,
    departuresPreview: yacht.departures.slice(0, 3).map((departure) => departure.dates),
    interests: buildCatalogInterests(yacht),
  }));

  return [...staticSnapshot, ...(await buildOperatorListingCatalogSnapshot())];
}

// Operator-authored listings (self-service, any region - see OperatorListing in schema.prisma)
// merged in alongside the static curated yachts, so Kai can match/discuss them the same way.
// Exported so the WhatsApp-facing snapshot route (app/api/kai/operator-listings-snapshot) can
// reuse the exact same mapping without duplicating the query - WhatsApp messages hit kai directly
// and never pass through this web-widget client at all, so they need their own pull endpoint.
export async function buildOperatorListingCatalogSnapshot() {
  const listings = await prisma.operatorListing.findMany({
    where: { status: "LIVE" },
    include: { operatorProfile: { select: { companyName: true } } },
  });

  return listings.map((listing) => ({
    slug: listing.slug,
    name: listing.title,
    region: listing.region,
    tier: listing.category,
    maxGuests: listing.maxGuests ?? 0,
    cabins: 0,
    priceSignal: listing.priceSignal ?? "Quote on request",
    charterPriceSignal: null,
    operatorId: `operator_listing_${listing.id}`,
    operatorName: listing.operatorProfile.companyName ?? listing.title,
    cabinBookable: false,
    about: listing.description,
    productUrl: null,
    imageUrl: listing.heroImageUrl,
    departuresPreview: [] as string[],
    interests: [] as string[],
  }));
}

function buildBluePassProductUrl(slug: string) {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://bluepass.co").replace(/\/$/, "");

  return `${baseUrl}/yachts/${slug}`;
}

function formatPriceSignal(value: string, label: string) {
  if (!value || /quote/i.test(value)) {
    return "Quote on request";
  }

  return `from ${value} ${label}`;
}

function buildCatalogInterests(yacht: (typeof yachts)[number]) {
  const text = [yacht.name, yacht.build, yacht.about, yacht.tier, yacht.region].join(" ").toLowerCase();
  const interests = [
    /dive|diving|scuba|liveaboard/.test(text) ? "dive" : null,
    /private|charter/.test(text) || yacht.charterOnly || Boolean(yacht.charterPrice) ? "private" : null,
    /phinisi|sailing|yacht/.test(text) ? "phinisi" : null,
    yacht.cabinBookable ? "cabin" : null,
    /luxury|legend|premium/.test(text) ? "luxury" : null,
  ].filter(Boolean) as string[];

  return Array.from(new Set(interests));
}
