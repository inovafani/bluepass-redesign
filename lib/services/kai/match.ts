import { prisma } from "@/lib/db/prisma";
import { yachts, type Yacht } from "@/lib/data/yachts";
import { decryptCredentials } from "@/lib/services/booking/adapters/credentials";
import type { BokunCredentials } from "@/lib/services/booking/adapters/bokun";
import type { KaiTravelIntent, MatchResult } from "./types";

type TripForMatching = {
  id: string;
  operatorId: string;
  externalId: string | null;
  title: string;
  description: string | null;
  location: string | null;
  imageUrl: string | null;
  priceCents: number;
  currency: string;
  operator: {
    name: string;
    integrations: Array<{
      platform: "BOKUN" | "REZDY" | "FAREHARBOR" | "NATIVE";
      encryptedCredentials?: string;
    }>;
  };
};

export async function matchTripsForKai(intent: KaiTravelIntent): Promise<MatchResult[]> {
  if (!intent.destination || !intent.tripType || !intent.guests || !intent.dateWindow || !intent.budget) {
    return [];
  }

  const syncedMatches = await findSyncedTripMatches(intent);
  const yachtMatches = yachts
    .map((yacht) => scoreYachtForIntent(yacht, intent))
    .filter((match) => match.score > 0);

  return limitMatchResults([...syncedMatches, ...yachtMatches]);
}

async function findSyncedTripMatches(intent: KaiTravelIntent) {
  try {
    const trips = await prisma.trip.findMany({
      where: {
        operator: {
          integrations: {
            some: {
              platform: "BOKUN",
            },
          },
        },
      },
      include: {
        operator: {
          select: {
            name: true,
            integrations: {
              where: { platform: "BOKUN" },
              select: { platform: true, encryptedCredentials: true },
            },
          },
        },
      },
      take: 40,
    });

    return trips
      .map((trip) => scoreTripForIntent(trip as TripForMatching, intent))
      .filter((match) => match.score > 0);
  } catch (error) {
    console.warn("kai.match.synced_trips_failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : "Unable to query synced trips",
    });
    return [];
  }
}

export function limitMatchResults(results: MatchResult[]): MatchResult[] {
  return results
    .slice()
    .sort((left, right) => right.score - left.score)
    .slice(0, 3);
}

function scoreTripForIntent(trip: TripForMatching, intent: KaiTravelIntent): MatchResult {
  const haystack = [trip.title, trip.description, trip.location].filter(Boolean).join(" ").toLowerCase();
  const destinationTerms = buildDestinationTerms(intent.destination);
  const tripTypeTerms = buildTripTypeTerms(intent.tripType);
  const destinationMatches = destinationTerms.some((term) => haystack.includes(term));
  const tripTypeMatches = tripTypeTerms.some((term) => haystack.includes(term));
  const reasons: string[] = [];
  let score = 0;

  if (!destinationMatches) {
    return buildUnmatchedResult(trip);
  }

  if (intent.tripType && !tripTypeMatches) {
    return buildUnmatchedResult(trip);
  }

  score += 55;
  reasons.push(`matches ${intent.destination}`);

  if (tripTypeMatches) {
    score += 35;
    reasons.push(`fits ${intent.tripType}`);
  }

  for (const interest of intent.interests ?? []) {
    if (haystack.includes(interest.toLowerCase())) {
      score += 8;
      reasons.push(`mentions ${interest}`);
    }
  }

  if (score > 0 && trip.operator.integrations.some((integration) => integration.platform === "BOKUN")) {
    score += 5;
    reasons.push("from a synced Bokun operator");
  }

  const budgetScore = scorePriceAgainstBudget(trip.priceCents / 100, intent.budget);

  score += budgetScore.score;
  if (budgetScore.reason) {
    reasons.push(budgetScore.reason);
  }

  return {
    tripId: trip.id,
    operatorId: trip.operatorId,
    externalId: trip.externalId ?? undefined,
    operatorName: trip.operator.name,
    title: trip.title,
    description: trip.description ?? undefined,
    location: publicLocation(trip.location),
    imageUrl: trip.imageUrl ?? undefined,
    priceCents: trip.priceCents,
    currency: trip.currency,
    orderUrl: buildPmsOrderUrl(trip),
    score,
    reason: reasons.join(", ") || "similar marine trip",
    pmsPlatform: "bokun",
  };
}

function scoreYachtForIntent(yacht: Yacht, intent: KaiTravelIntent): MatchResult {
  const destinationTerms = buildDestinationTerms(intent.destination);
  const tripTypeTerms = buildTripTypeTerms(intent.tripType);
  const haystack = [
    yacht.name,
    yacht.region,
    yacht.locationBadge,
    yacht.tier,
    yacht.build,
    yacht.tagline,
    yacht.about,
    yacht.conservation,
    "liveaboard sailing yacht charter cabin diving snorkelling",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const regionText = `${yacht.region} ${yacht.locationBadge}`.toLowerCase();
  const destinationMatches = destinationTerms.some((term) => regionText.includes(term));
  const tripTypeMatches = tripTypeTerms.some((term) => haystack.includes(term));
  const reasons: string[] = [];
  let score = 0;

  if (!destinationMatches || !tripTypeMatches || !intent.guests || intent.guests > yacht.maxGuests) {
    return buildUnmatchedYachtResult(yacht);
  }

  score += 55;
  reasons.push(`matches ${yacht.region}`);
  score += 25;
  reasons.push(`fits ${intent.tripType}`);

  if (yacht.cabinBookable) {
    score += 8;
    reasons.push("cabin-bookable");
  }

  if (yacht.tier) {
    score += yacht.tier === "Explorer" ? 6 : yacht.tier === "Premium" ? 4 : 2;
    reasons.push(`${yacht.tier} tier`);
  }

  const cabinPrice = parseUsdAmount(yacht.pricePerCabin);
  const charterPrice = parseUsdAmount(yacht.charterPrice);
  const bestComparablePrice = chooseComparableYachtPrice(yacht, cabinPrice, charterPrice);
  const budgetScore = scorePriceAgainstBudget(bestComparablePrice, intent.budget);

  score += budgetScore.score;
  if (budgetScore.reason) {
    reasons.push(budgetScore.reason);
  }

  for (const interest of intent.interests ?? []) {
    if (haystack.includes(interest.toLowerCase())) {
      score += 8;
      reasons.push(`mentions ${interest}`);
    }
  }

  return {
    tripId: `yacht_${yacht.slug}`,
    operatorId: `operator_${yacht.slug}`,
    externalId: yacht.slug,
    operatorName: yacht.name,
    title: `${yacht.name} ${yacht.region} ${intent.tripType}`,
    description: yacht.about,
    location: yacht.region,
    imageUrl: yacht.images.card,
    priceCents: bestComparablePrice ? bestComparablePrice * 100 : undefined,
    currency: bestComparablePrice ? "USD" : undefined,
    orderUrl: `/yachts/${yacht.slug}`,
    score,
    reason: reasons.join(", "),
  };
}

function buildUnmatchedYachtResult(yacht: Yacht): MatchResult {
  return {
    tripId: `yacht_${yacht.slug}`,
    operatorId: `operator_${yacht.slug}`,
    externalId: yacht.slug,
    operatorName: yacht.name,
    title: yacht.name,
    description: yacht.about,
    location: yacht.region,
    imageUrl: yacht.images.card,
    score: 0,
    reason: "does not match the requested destination, activity, group size, or budget",
  };
}

function chooseComparableYachtPrice(
  yacht: Yacht,
  cabinPrice?: number,
  charterPrice?: number,
) {
  if (yacht.cabinBookable && cabinPrice) {
    return cabinPrice;
  }

  return charterPrice ?? cabinPrice;
}

function scorePriceAgainstBudget(priceUsd: number | undefined, budget?: string) {
  const budgetUsd = parseBudgetUsd(budget);

  if (!budgetUsd || !priceUsd) {
    return { score: 0, reason: undefined };
  }

  if (priceUsd <= budgetUsd) {
    return { score: 14, reason: `fits ${formatUsd(budgetUsd)} budget` };
  }

  if (priceUsd <= budgetUsd * 1.2) {
    return { score: 3, reason: `slightly above ${formatUsd(budgetUsd)} budget` };
  }

  return { score: -18, reason: `above ${formatUsd(budgetUsd)} budget` };
}

function parseBudgetUsd(budget?: string) {
  if (!budget) {
    return undefined;
  }

  return parseUsdAmount(budget);
}

function parseUsdAmount(value?: string | null) {
  if (!value) {
    return undefined;
  }

  const normalized = value.toLowerCase().replace(/,/g, "");
  const kMatch = normalized.match(/\b(\d{1,3}(?:\.\d)?)\s*k\b/);

  if (kMatch) {
    return Math.round(Number(kMatch[1]) * 1000);
  }

  const numberMatch = normalized.match(/\b(\d{2,6})\b/);

  if (!numberMatch) {
    return undefined;
  }

  return Number(numberMatch[1]);
}

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function buildUnmatchedResult(trip: TripForMatching): MatchResult {
  return {
    tripId: trip.id,
    operatorId: trip.operatorId,
    externalId: trip.externalId ?? undefined,
    operatorName: trip.operator.name,
    title: trip.title,
    description: trip.description ?? undefined,
    location: publicLocation(trip.location),
    imageUrl: trip.imageUrl ?? undefined,
    priceCents: trip.priceCents,
    currency: trip.currency,
    orderUrl: undefined,
    score: 0,
    reason: "does not match the requested destination and activity",
    pmsPlatform: "bokun",
  };
}

function publicLocation(location: string | null) {
  if (!location || /^[A-Za-z_]+\/[A-Za-z_]+(?:\/[A-Za-z_]+)?$/.test(location)) {
    return undefined;
  }

  return location;
}

function buildPmsOrderUrl(trip: TripForMatching) {
  if (!trip.externalId) {
    return undefined;
  }

  const credentials = getBokunPublicCredentials(trip);
  const template = credentials?.publicProductUrlTemplate;

  if (template) {
    return template
      .replace(/\{productId\}/g, encodeURIComponent(trip.externalId))
      .replace(/\{externalId\}/g, encodeURIComponent(trip.externalId));
  }

  const baseUrl = credentials?.publicBookingBaseUrl;

  if (!baseUrl) {
    return undefined;
  }

  return `${baseUrl.replace(/\/$/, "")}/${encodeURIComponent(trip.externalId)}`;
}

function getBokunPublicCredentials(trip: TripForMatching) {
  const integration = trip.operator.integrations.find(
    (item) => item.platform === "BOKUN" && item.encryptedCredentials,
  );

  if (!integration?.encryptedCredentials) {
    return undefined;
  }

  try {
    return decryptCredentials<BokunCredentials>(integration.encryptedCredentials);
  } catch (error) {
    console.warn("kai.match.bokun_public_credentials_failed", {
      operatorId: trip.operatorId,
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return undefined;
  }
}

function buildDestinationTerms(destination?: string) {
  if (!destination) {
    return [];
  }

  const normalized = destination.toLowerCase();
  const aliases: Record<string, string[]> = {
    komodo: ["komodo", "labuan bajo", "flores"],
    "raja ampat": ["raja ampat", "misool", "sorong"],
    bali: ["bali", "denpasar", "sanur"],
    "nusa penida": ["nusa penida", "penida"],
    "nusa lembongan": ["nusa lembongan", "lembongan"],
    lombok: ["lombok", "gili"],
  };

  return aliases[normalized] ?? [normalized];
}

function buildTripTypeTerms(tripType?: string) {
  if (!tripType) {
    return [];
  }

  const normalized = tripType.toLowerCase();
  const aliases: Record<string, string[]> = {
    sailing: ["sailing", "sail", "boat", "cruise", "yacht", "sunset tour"],
    "boat tour": ["boat tour", "boat", "cruise", "sunset tour"],
    "sunset tour": ["sunset tour", "sunset", "boat", "cruise"],
    diving: ["diving", "dive", "scuba"],
    liveaboard: ["liveaboard", "live aboard"],
    snorkelling: ["snorkelling", "snorkeling", "snorkel"],
    surf: ["surf", "surfing"],
  };

  return aliases[normalized] ?? [normalized];
}
