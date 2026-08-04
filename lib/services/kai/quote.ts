import type { MatchResult } from "./types";
import { getBookingAdapter } from "@/lib/services/booking/adapters";

export type KaiQuoteDraft = {
  match: MatchResult;
  quoteText: string;
  availability?: {
    available: boolean;
    priceCents: number;
    currency: string;
    holdable: boolean;
  };
};

export function draftKaiQuote(match: MatchResult): KaiQuoteDraft {
  return {
    match,
    quoteText: `${match.title} is ready for operator review.`,
  };
}

export async function getKaiQuoteAvailability(
  match: MatchResult,
  startsAt: string,
  travellers: number,
): Promise<KaiQuoteDraft["availability"]> {
  if (!match.pmsPlatform) {
    return undefined;
  }

  const adapter = getBookingAdapter(match.pmsPlatform);

  return adapter.checkAvailability({
    operatorId: match.operatorId,
    tripId: match.tripId,
    startsAt,
    travellers,
  });
}
