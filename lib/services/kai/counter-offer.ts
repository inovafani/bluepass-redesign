export type ParsedCounterOffer = {
  rawText: string;
  parsed: false;
  proposedPriceDeltaUsd: null;
  proposedDateChange: null;
  proposedGuestChange: null;
};

export function parseCounterOfferText(text: string): ParsedCounterOffer {
  // TODO: v1 likely supports price-only counter offers first before richer date/guest parsing.
  return {
    rawText: text.trim(),
    parsed: false,
    proposedPriceDeltaUsd: null,
    proposedDateChange: null,
    proposedGuestChange: null,
  };
}
