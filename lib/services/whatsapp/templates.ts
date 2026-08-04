export const whatsappTemplateNames = {
  bookingInquiryOperator: "booking_inquiry_operator",
  bookingQuoteTraveller: "booking_quote_traveller",
  bookingConfirmedTraveller: "booking_confirmed_traveller",
  paymentReminderTraveller: "payment_reminder_traveller",
} as const;

export type OperatorInquiryParams = {
  inquiryTitle: string;
  travellerName: string;
  travellerPhone: string;
  dateRange: string;
  guests: string;
  quote: string;
  tripTitle: string;
  notes: string;
};

export type TravellerQuoteParams = {
  travellerName: string;
  tripTitle: string;
  operatorName: string;
  totalLabel: string;
  conservationLabel: string;
};

export function buildOperatorInquiryParams(input: OperatorInquiryParams): string[] {
  return [
    input.inquiryTitle,
    input.travellerName,
    input.travellerPhone,
    input.dateRange,
    input.guests,
    input.quote,
    input.tripTitle,
    input.notes,
  ];
}

export function buildTravellerQuoteParams(input: TravellerQuoteParams): string[] {
  return [
    input.travellerName,
    input.tripTitle,
    input.operatorName,
    input.totalLabel,
    input.conservationLabel,
  ];
}

export function buildAcceptPayload(bookingId: string): string {
  return `accept:${bookingId.trim()}`;
}

export function buildDeclinePayload(bookingId: string): string {
  return `decline:${bookingId.trim()}`;
}

export function buildCounterPayload(bookingId: string): string {
  return `counter:${bookingId.trim()}`;
}
