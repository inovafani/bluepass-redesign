import type { ActorPayload } from "@/lib/services/booking/orchestrator";
import { splitBooking } from "@/lib/services/booking/unit-economics";
import {
  buildAcceptPayload,
  buildCounterPayload,
  buildDeclinePayload,
  buildOperatorInquiryParams,
  whatsappTemplateNames,
} from "@/lib/services/whatsapp/templates";

export type OperatorAction = "accept" | "decline" | "counter";

export type OperatorDispatchInput = {
  bookingId: string;
  action: OperatorAction;
  payload: ActorPayload;
};

export type DeclineReason =
  | "SOLD_OUT"
  | "WRONG_FIT"
  | "DATES_IMPOSSIBLE"
  | "OTHER"
  | "SKIPPED";

export type OperatorInquiryTemplateInput = {
  to: string;
  bookingId: string;
  inquiryTitle: string;
  travellerName: string;
  travellerPhone: string;
  dateRange: string;
  guests: string;
  quote: string;
  tripTitle: string;
  notes: string;
};

export type WhatsAppTemplatePayload = {
  to: string;
  type: "template";
  template: {
    name: string;
    language: { code: "en" };
    components: Array<
      | {
          type: "body";
          parameters: Array<{ type: "text"; text: string }>;
        }
      | {
          type: "button";
          sub_type: "quick_reply";
          index: "0" | "1" | "2";
          parameters: [{ type: "payload"; payload: string }];
        }
    >;
  };
};

export type OperatorBookingSummaryInput = {
  bookingShortCode: string;
  travellerName: string;
  travellerEmail: string;
  travellerWhatsApp: string;
  dateRange: string;
  guestCount: number;
  certificationLevel: string;
  dietaryRestrictions?: string | null;
  insuranceStatus: string;
  insurancePolicy?: string | null;
  arrivalFlight?: string | null;
  totalUsd: number;
  creatorAttributed?: boolean;
  pmsReference?: string | null;
};

export type FreeTextMessage = {
  type: "text";
  body: string;
};

function money(value: number): string {
  return `$${value.toFixed(2)}`;
}

function optionalValue(value: string | null | undefined): string {
  return value?.trim() ? value : "Not provided";
}

export function buildOperatorInquiryTemplatePayload(
  input: OperatorInquiryTemplateInput,
): WhatsAppTemplatePayload {
  return {
    to: input.to,
    type: "template",
    template: {
      name: whatsappTemplateNames.bookingInquiryOperator,
      language: { code: "en" },
      components: [
        {
          type: "body",
          parameters: buildOperatorInquiryParams(input).map((text) => ({
            type: "text",
            text,
          })),
        },
        {
          type: "button",
          sub_type: "quick_reply",
          index: "0",
          parameters: [{ type: "payload", payload: buildAcceptPayload(input.bookingId) }],
        },
        {
          type: "button",
          sub_type: "quick_reply",
          index: "1",
          parameters: [{ type: "payload", payload: buildDeclinePayload(input.bookingId) }],
        },
        {
          type: "button",
          sub_type: "quick_reply",
          index: "2",
          parameters: [{ type: "payload", payload: buildCounterPayload(input.bookingId) }],
        },
      ],
    },
  };
}

export function buildOperatorInquiryFreeText(
  input: OperatorInquiryTemplateInput,
): FreeTextMessage {
  return {
    type: "text",
    body: [
      "New BluePass inquiry",
      "",
      `Inquiry: ${input.inquiryTitle}`,
      `Traveller: ${input.travellerName}`,
      `Traveller WhatsApp: ${input.travellerPhone}`,
      `Dates: ${input.dateRange}`,
      `Guests: ${input.guests}`,
      `Budget / quote signal: ${input.quote}`,
      `Trip: ${input.tripTitle}`,
      `Notes: ${input.notes}`,
      "",
      `Reply accept:${input.bookingId}, decline:${input.bookingId}, or counter:${input.bookingId}.`,
    ].join("\n"),
  };
}

export function buildOperatorAcceptedFreeText(
  input: OperatorBookingSummaryInput,
): FreeTextMessage {
  const split = splitBooking(input.totalUsd, input.creatorAttributed);

  return {
    type: "text",
    body: [
      `Accepted: ${input.bookingShortCode}`,
      "",
      `Traveller: ${input.travellerName}`,
      `Email: ${input.travellerEmail}`,
      `WhatsApp: ${input.travellerWhatsApp}`,
      `Dates: ${input.dateRange}`,
      `Guests: ${input.guestCount}`,
      `Certification: ${input.certificationLevel}`,
      `Dietary restrictions: ${optionalValue(input.dietaryRestrictions)}`,
      `Insurance: ${input.insuranceStatus}`,
      `Policy: ${optionalValue(input.insurancePolicy)}`,
      `Arrival flight: ${optionalValue(input.arrivalFlight)}`,
      "",
      `Total price: ${money(split.total)}`,
      `Operator net: ${money(split.operatorNet)}`,
      `BluePass commission: ${money(split.commission)}`,
      `Conservation amount: ${money(split.conservation)}`,
      `Payment processor estimate: ${money(split.stripeEstimatedFee)}`,
      `PMS reference: ${optionalValue(input.pmsReference)}`,
    ].join("\n"),
  };
}

export function buildOperatorDeclinedFreeText(input: {
  peerOperatorName: string;
}): FreeTextMessage {
  return {
    type: "text",
    body: [
      `Got it, declined. We'll route this to ${input.peerOperatorName} who has matching capacity that week.`,
      "",
      "Quick note (optional, helps our matching): why decline?",
      "1. Sold out",
      "2. Wrong fit",
      "3. Dates impossible",
      "4. Other",
      "Reply with a number or skip.",
    ].join("\n"),
  };
}

export function buildOperatorCounterPrompt(input: {
  bookingShortCode: string;
}): FreeTextMessage {
  return {
    type: "text",
    body: [
      `Counter requested for ${input.bookingShortCode}.`,
      "Reply with the counter-offer details in plain text.",
      "For now, BluePass will capture the message and prepare a structured counter flow.",
    ].join("\n"),
  };
}

export async function dispatchOperatorAction(
  _input: OperatorDispatchInput,
): Promise<void> {
  void _input;

  throw new Error("Not implemented yet");
}
