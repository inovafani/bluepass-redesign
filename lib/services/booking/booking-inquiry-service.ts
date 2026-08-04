import type { BookingInquiryStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { yachtBySlug } from "@/lib/data/yachts";
import { sanitizeJsonForPrisma } from "@/lib/services/kai/json-safety";
import type { KaiTravelIntent } from "@/lib/services/kai/types";
import { syncReferralCommissionLedger } from "@/lib/services/referrals/commission-ledger";

const activeInquiryStatuses: BookingInquiryStatus[] = [
  "DRAFT",
  "READY_TO_DISPATCH",
  "OPERATOR_PENDING",
  "COUNTER_OFFERED",
];

export type CreateInquiryFromKaiSessionInput = {
  sessionId: string;
  selectedYachtSlug?: string;
  notes?: string;
  travellerName?: string;
  travellerEmail?: string;
  travellerPhone?: string;
};

export function canCreateInquiryFromIntent(
  intent: KaiTravelIntent,
  input: { selectedYachtSlug?: string; notes?: string } = {},
) {
  const missingSlots: string[] = [];

  if (!intent.destination) {
    missingSlots.push("destination");
  }

  if (!intent.tripType) {
    missingSlots.push("tripType");
  }

  if (!intent.guests) {
    missingSlots.push("guests");
  }

  if (!intent.dateWindow) {
    missingSlots.push("dateWindow");
  }

  if (!intent.budget) {
    missingSlots.push("budget");
  }

  if (!input.selectedYachtSlug && !input.notes?.trim()) {
    missingSlots.push("selectedYachtSlug");
  }

  if (!intent.travellerName) {
    missingSlots.push("travellerName");
  }

  if (!intent.travellerEmail) {
    missingSlots.push("travellerEmail");
  }

  if (!intent.travellerPhone) {
    missingSlots.push("travellerPhone");
  }

  return {
    ok: missingSlots.length === 0,
    missingSlots,
  };
}

export async function createInquiryFromKaiSession(input: CreateInquiryFromKaiSessionInput) {
  const selectedYacht = input.selectedYachtSlug ? yachtBySlug[input.selectedYachtSlug] : undefined;

  if (input.selectedYachtSlug && !selectedYacht) {
    return {
      ok: false as const,
      missingSlots: ["selectedYachtSlug"],
      error: "Selected yacht was not found in the BluePass preview catalog.",
    };
  }

  const session = await prisma.kaiSession.findUnique({
    where: { id: input.sessionId },
    select: {
      id: true,
      channel: true,
      travellerPhone: true,
      referralLinkId: true,
      referralPartnerId: true,
      referralCode: true,
      referralRole: true,
      slots: true,
    },
  });

  if (!session) {
    return {
      ok: false as const,
      missingSlots: ["sessionId"],
      error: "Kai session was not found.",
    };
  }

  const intent = extractIntentFromSessionSlots(session.slots);
  const readiness = canCreateInquiryFromIntent(intent, {
    selectedYachtSlug: input.selectedYachtSlug,
    notes: input.notes,
  });

  if (!readiness.ok) {
    return {
      ok: false as const,
      missingSlots: readiness.missingSlots,
    };
  }

  const existing = await getActiveInquiryByKaiSession(input.sessionId);

  if (existing) {
    const updated = await prisma.bookingInquiry.update({
      where: { id: existing.id },
      data: {
        selectedYachtSlug: selectedYacht?.slug ?? existing.selectedYachtSlug,
        selectedYachtName: selectedYacht?.name ?? existing.selectedYachtName,
        travellerName: input.travellerName ?? intent.travellerName ?? existing.travellerName,
        travellerEmail: input.travellerEmail ?? intent.travellerEmail ?? existing.travellerEmail,
        travellerPhone:
          input.travellerPhone ??
          intent.travellerPhone ??
          session.travellerPhone ??
          existing.travellerPhone,
        destination: intent.destination,
        tripType: intent.tripType,
        dateWindow: intent.dateWindow,
        guests: intent.guests,
        certificationLevel: intent.certificationLevel,
        budget: intent.budget,
        interests: sanitizeJsonForPrisma(intent.interests) as Prisma.InputJsonValue | undefined,
        notes: input.notes ?? existing.notes,
        referralLinkId: session.referralLinkId ?? existing.referralLinkId,
        referralPartnerId: session.referralPartnerId ?? existing.referralPartnerId,
        referralCode: session.referralCode ?? existing.referralCode,
        referralRole: session.referralRole ?? existing.referralRole,
        status: "READY_TO_DISPATCH",
      },
    });

    await syncReferralCommissionLedger({
      bookingInquiryId: updated.id,
      referralPartnerId: updated.referralPartnerId,
      referralLinkId: updated.referralLinkId,
      referralCode: updated.referralCode,
      referralRole: updated.referralRole,
      budget: updated.budget,
    });

    return {
      ok: true as const,
      inquiry: updated,
      missingSlots: [],
      reusedExisting: true,
    };
  }

  const inquiry = await prisma.bookingInquiry.create({
    data: {
      sourceChannel: session.channel,
      kaiSessionId: session.id,
      selectedYachtSlug: selectedYacht?.slug,
      selectedYachtName: selectedYacht?.name,
      travellerName: input.travellerName ?? intent.travellerName,
      travellerEmail: input.travellerEmail ?? intent.travellerEmail,
      travellerPhone: input.travellerPhone ?? intent.travellerPhone ?? session.travellerPhone,
      destination: intent.destination,
      tripType: intent.tripType,
      dateWindow: intent.dateWindow,
      guests: intent.guests,
      certificationLevel: intent.certificationLevel,
      budget: intent.budget,
      interests: sanitizeJsonForPrisma(intent.interests) as Prisma.InputJsonValue | undefined,
      notes: input.notes,
      referralLinkId: session.referralLinkId,
      referralPartnerId: session.referralPartnerId,
      referralCode: session.referralCode,
      referralRole: session.referralRole,
      status: "READY_TO_DISPATCH",
    },
  });

  await syncReferralCommissionLedger({
    bookingInquiryId: inquiry.id,
    referralPartnerId: inquiry.referralPartnerId,
    referralLinkId: inquiry.referralLinkId,
    referralCode: inquiry.referralCode,
    referralRole: inquiry.referralRole,
    budget: inquiry.budget,
  });

  return {
    ok: true as const,
    inquiry,
    missingSlots: [],
    reusedExisting: false,
  };
}

export async function getActiveInquiryByKaiSession(sessionId: string) {
  return prisma.bookingInquiry.findFirst({
    where: {
      kaiSessionId: sessionId,
      status: { in: activeInquiryStatuses },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function markInquiryReadyToDispatch(inquiryId: string) {
  return updateInquiryStatus(inquiryId, "READY_TO_DISPATCH");
}

export async function updateInquiryStatus(
  inquiryId: string,
  status: BookingInquiryStatus,
) {
  return prisma.bookingInquiry.update({
    where: { id: inquiryId },
    data: { status },
  });
}

function extractIntentFromSessionSlots(slots: unknown): KaiTravelIntent {
  if (!isRecord(slots)) {
    return {};
  }

  const candidate = isRecord(slots.intent) ? slots.intent : slots;
  const intent: KaiTravelIntent = {};

  if (typeof candidate.destination === "string") {
    intent.destination = candidate.destination;
  }

  if (typeof candidate.tripType === "string") {
    intent.tripType = candidate.tripType;
  }

  if (typeof candidate.dateWindow === "string") {
    intent.dateWindow = candidate.dateWindow;
  }

  if (typeof candidate.guests === "number") {
    intent.guests = candidate.guests;
  }

  if (typeof candidate.budget === "string") {
    intent.budget = candidate.budget;
  }

  if (typeof candidate.certificationLevel === "string") {
    intent.certificationLevel = candidate.certificationLevel;
  }

  if (typeof candidate.travellerName === "string") {
    intent.travellerName = candidate.travellerName;
  }

  if (typeof candidate.travellerEmail === "string") {
    intent.travellerEmail = candidate.travellerEmail;
  }

  if (typeof candidate.travellerPhone === "string") {
    intent.travellerPhone = candidate.travellerPhone;
  }

  if (Array.isArray(candidate.interests)) {
    intent.interests = candidate.interests.filter(
      (interest): interest is string => typeof interest === "string",
    );
  }

  return intent;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
