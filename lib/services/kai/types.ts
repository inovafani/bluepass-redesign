import type { CertLevel } from "@prisma/client";
import type { ReferralAttribution } from "@/lib/services/referrals/attribution";
import type { BookingAdapterPlatform } from "@/lib/services/booking/adapters/types";

export type KaiChannel = "web" | "whatsapp";

export type KaiMessageRole = "user" | "assistant" | "system";

export type KaiSessionStatus = "open" | "handoff" | "closed";

export type KaiSlots = {
  destination?: string;
  dateWindow?: string;
  travellerCount?: number;
  certLevel?: CertLevel;
  budgetUsd?: number;
  activityType?: string;
};

export type KaiTravelIntent = {
  destination?: string;
  tripType?: string;
  dateWindow?: string;
  guests?: number;
  budget?: string;
  certificationLevel?: string;
  travellerName?: string;
  travellerEmail?: string;
  travellerPhone?: string;
  selectedYachtSlug?: string;
  interests?: string[];
  conservationPreference?: string;
  unsupportedDestination?: string;
  missingSlots?: string[];
};

export type KaiMissingSlot = NonNullable<KaiTravelIntent["missingSlots"]>[number];

export type KaiSessionContext = {
  intent: KaiTravelIntent;
  lastAskedSlot?: KaiMissingSlot;
  missingSlots?: KaiMissingSlot[];
};

export type MatchResult = {
  tripId: string;
  operatorId: string;
  externalId?: string;
  operatorName?: string;
  title: string;
  description?: string;
  location?: string;
  imageUrl?: string;
  priceCents?: number;
  currency?: string;
  orderUrl?: string;
  score: number;
  reason: string;
  pmsPlatform?: BookingAdapterPlatform;
};

export type YachtMatch = {
  slug: string;
  name: string;
  region: "Komodo" | "Raja Ampat";
  heroImageUrl?: string;
  tier: string;
  cabinBookable: boolean;
  maxGuests: number;
  cabins: number;
  pricePerCabin: string;
  charterPrice: string | null;
  charterOnly: boolean;
  matchingReasons: string[];
  departuresPreview: string[];
  score: number;
};

export type KaiSuggestedReply = {
  label: string;
  message: string;
};

export type YachtInquiryHandoffPlan = {
  selectedYachtSlug: string;
  travellerApproved: boolean;
  nextStep:
    | "create_booking_inquiry"
    | "dispatch_operator_whatsapp"
    | "await_operator_contact_mapping";
};

export type KaiBookingContext = {
  slots?: KaiSlots;
  bookingId?: string;
  tripId?: string;
  operatorId?: string;
  metadata?: Record<string, unknown>;
};

export type KaiTravellerProfile = {
  id: string;
  accountId?: string;
  travellerId?: string;
  name?: string;
  email?: string;
  phone?: string;
};

export type KaiConversationMessage = {
  id?: string;
  sessionId: string;
  channel: KaiChannel;
  role: KaiMessageRole;
  content: string;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
};

export type KaiConversationInput = {
  channel: KaiChannel;
  sessionId?: string;
  externalUserId?: string;
  travellerPhone?: string;
  travellerProfile?: KaiTravellerProfile;
  referralAttribution?: ReferralAttribution;
  message: string;
  recentMessages?: Array<Pick<KaiConversationMessage, "role" | "content">>;
  bookingContext?: KaiBookingContext;
};

export type KaiConversationResult = {
  sessionId: string;
  reply: string;
  intent: KaiTravelIntent;
  matches?: YachtMatch[];
  suggestedReplies?: KaiSuggestedReply[];
  planner?: KaiConversationPlan;
  messages: KaiConversationMessage[];
};

export type KaiConversationStage = "discovery" | "qualification" | "ready_to_match";

export type KaiConversationPlan = {
  knownSlots: string[];
  missingSlots: string[];
  nextSlotToAsk?: string;
  conversationStage: KaiConversationStage;
  instructionForReply: string;
};
