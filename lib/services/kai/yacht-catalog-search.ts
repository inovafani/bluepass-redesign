import { yachtBySlug, yachts, type Yacht } from "@/lib/data/yachts";
import type { KaiTravelIntent, YachtMatch } from "@/lib/services/kai/types";

const MAX_RESULTS = 3;

export function searchYachtsForIntent(intent: KaiTravelIntent): YachtMatch[] {
  if (!hasUsefulCatalogIntent(intent)) {
    return [];
  }

  return yachts
    .map((yacht) => scoreYachtForIntent(yacht, intent))
    .filter((match) => match.score > 0)
    .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name))
    .slice(0, MAX_RESULTS);
}

export function getYachtBySlug(slug: string) {
  return yachtBySlug[slug];
}

export function formatYachtSuggestionForKai(match: YachtMatch) {
  const priceText = match.charterOnly
    ? `private charter pricing: ${match.charterPrice ?? "quote on request"}`
    : `cabins from ${match.pricePerCabin}${match.charterPrice ? `, charter from ${match.charterPrice}` : ""}`;
  const tierText = match.tier ? `${match.tier} tier` : "preview fleet";
  const reasons = match.matchingReasons.slice(0, 3).join(", ");

  return `${match.name} (${match.region}, ${tierText}) - ${priceText}. Why it fits: ${reasons}.`;
}

function hasUsefulCatalogIntent(intent: KaiTravelIntent) {
  return Boolean(resolveRegion(intent.destination) && intent.tripType && intent.guests);
}

function scoreYachtForIntent(yacht: Yacht, intent: KaiTravelIntent): YachtMatch {
  const region = resolveRegion(intent.destination);
  const reasons: string[] = [];
  let score = 0;
  const isSelectedYacht = intent.selectedYachtSlug === yacht.slug;

  if (isSelectedYacht) {
    score += 100;
    reasons.push("selected by traveller");
  }

  if (!region || yacht.region !== region || !intent.guests || intent.guests > yacht.maxGuests) {
    if (isSelectedYacht) {
      if (region && yacht.region !== region) {
        reasons.push(`listed for ${yacht.region}, not ${region}`);
      }

      if (intent.guests && intent.guests > yacht.maxGuests) {
        reasons.push(`max ${yacht.maxGuests} guests - operator must confirm fit`);
      }

      return buildYachtMatch(yacht, unique(reasons), Math.max(0, score));
    }

    return buildYachtMatch(yacht, [], 0);
  }

  score += 50;
  reasons.push(`${yacht.region} route`);

  score += 24;
  reasons.push(`fits ${intent.guests} guests`);

  const tripTypeScore = scoreTripType(yacht, intent.tripType);
  score += tripTypeScore.score;
  reasons.push(...tripTypeScore.reasons);

  const budgetScore = scoreBudget(yacht, intent);
  score += budgetScore.score;
  reasons.push(...budgetScore.reasons);

  const groupScore = scoreGroupStyle(yacht, intent);
  score += groupScore.score;
  reasons.push(...groupScore.reasons);

  const interestScore = scoreInterests(yacht, intent);
  score += interestScore.score;
  reasons.push(...interestScore.reasons);

  return buildYachtMatch(yacht, unique(reasons), Math.max(0, score));
}

function scoreTripType(yacht: Yacht, tripType?: string) {
  const normalized = tripType?.toLowerCase() ?? "";
  const haystack = yachtSearchText(yacht);
  const reasons: string[] = [];
  let score = 0;

  if (
    normalized.includes("diving") ||
    normalized.includes("liveaboard") ||
    normalized.includes("cruising") ||
    normalized.includes("mix")
  ) {
    if (/(dive|diving|liveaboard|scuba)/.test(haystack)) {
      score += 22;
      reasons.push("liveaboard/diving profile");
    } else if (/(phinisi|yacht|charter|ship|cruise|cruising)/.test(haystack)) {
      score += 18;
      reasons.push("liveaboard/cruising profile");
    }
  } else if (normalized.includes("sailing") || normalized.includes("yacht") || normalized.includes("charter")) {
    if (/(phinisi|sailing|yacht|charter|ship)/.test(haystack)) {
      score += 18;
      reasons.push("sailing yacht fit");
    }
  } else if (haystack.includes(normalized)) {
    score += 12;
    reasons.push(`mentions ${tripType}`);
  }

  return { score, reasons };
}

function scoreBudget(yacht: Yacht, intent: KaiTravelIntent) {
  const budgetText = `${intent.budget ?? ""} ${(intent.interests ?? []).join(" ")}`.toLowerCase();
  const reasons: string[] = [];
  let score = 0;

  if (/\b(budget|affordable|low|cheap)\b/.test(budgetText)) {
    if (yacht.cabinBookable) {
      score += 18;
      reasons.push("cabin bookable");
    }

    const cabinPrice = parseUsdAmount(yacht.pricePerCabin);
    if (cabinPrice && cabinPrice <= 1000) {
      score += 12;
      reasons.push("lower cabin price");
    } else if (cabinPrice && cabinPrice <= 2500) {
      score += 5;
      reasons.push("moderate cabin price");
    }
  }

  if (/\b(luxury|premium|legend|private|charter)\b/.test(budgetText)) {
    if (yacht.tier === "Premium" || yacht.tier === "Legend") {
      score += 14;
      reasons.push(`${yacht.tier} tier`);
    }

    if (yacht.charterOnly || yacht.charterPrice) {
      score += 10;
      reasons.push("private charter option");
    }
  }

  const numericBudget = parseUsdAmount(intent.budget);
  const comparablePrice = yacht.cabinBookable
    ? parseUsdAmount(yacht.pricePerCabin)
    : parseUsdAmount(yacht.charterPrice) ?? parseUsdAmount(yacht.pricePerCabin);

  if (numericBudget && comparablePrice) {
    if (comparablePrice <= numericBudget) {
      score += 10;
      reasons.push("within stated budget signal");
    } else if (comparablePrice > numericBudget * 1.5) {
      score -= 10;
      reasons.push("above stated budget signal");
    }
  }

  return { score, reasons };
}

function scoreGroupStyle(yacht: Yacht, intent: KaiTravelIntent) {
  const reasons: string[] = [];
  let score = 0;

  if (!intent.guests) {
    return { score, reasons };
  }

  const privateSignal = /\b(private|charter|honeymoon|luxury)\b/i.test(
    `${intent.budget ?? ""} ${intent.tripType ?? ""} ${(intent.interests ?? []).join(" ")}`,
  );

  if (intent.guests <= 4 && yacht.cabinBookable && !privateSignal) {
    score += 8;
    reasons.push("small-group cabin booking");
  }

  if (privateSignal && (yacht.charterOnly || yacht.charterPrice)) {
    score += 10;
    reasons.push("supports private charter style");
  }

  return { score, reasons };
}

function scoreInterests(yacht: Yacht, intent: KaiTravelIntent) {
  const haystack = yachtSearchText(yacht);
  const reasons: string[] = [];
  let score = 0;

  for (const interest of intent.interests ?? []) {
    const normalized = interest.toLowerCase();
    const matched =
      haystack.includes(normalized) ||
      (normalized.includes("manta") && haystack.includes("manta")) ||
      (normalized.includes("photo") && /(photo|camera|macro)/.test(haystack)) ||
      (normalized.includes("remote") && /(remote|wayag|misool|quiet)/.test(haystack)) ||
      (normalized.includes("conservation") && haystack.includes("conservation"));

    if (matched) {
      score += 8;
      reasons.push(`matches ${interest}`);
    }
  }

  if (intent.conservationPreference && yacht.conservation) {
    score += 6;
    reasons.push("conservation contribution");
  }

  return { score, reasons };
}

function buildYachtMatch(yacht: Yacht, matchingReasons: string[], score: number): YachtMatch {
  return {
    slug: yacht.slug,
    name: yacht.name,
    region: yacht.region,
    heroImageUrl: yacht.images.hero,
    tier: yacht.tier,
    cabinBookable: yacht.cabinBookable,
    maxGuests: yacht.maxGuests,
    cabins: yacht.cabins,
    pricePerCabin: yacht.pricePerCabin,
    charterPrice: yacht.charterPrice,
    charterOnly: yacht.charterOnly,
    matchingReasons,
    departuresPreview: yacht.departures.slice(0, 3).map((departure) => departure.dates),
    score,
  };
}

function resolveRegion(destination?: string): Yacht["region"] | undefined {
  const normalized = destination?.toLowerCase() ?? "";

  if (/raja ampat|misool|sorong|wayag/.test(normalized)) {
    return "Raja Ampat";
  }

  if (/komodo|labuan bajo|flores|rinca/.test(normalized)) {
    return "Komodo";
  }

  return undefined;
}

function yachtSearchText(yacht: Yacht) {
  return [
    yacht.name,
    yacht.region,
    yacht.locationBadge,
    yacht.tier,
    yacht.build,
    yacht.tagline,
    yacht.about,
    yacht.conservation,
    yacht.departures.map((departure) => departure.dates).join(" "),
    yacht.itinerary.map((day) => `${day.title} ${day.description}`).join(" "),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
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

  return numberMatch ? Number(numberMatch[1]) : undefined;
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}
