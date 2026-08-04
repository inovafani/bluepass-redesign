import type {
  KaiChannel,
  KaiConversationPlan,
  KaiMissingSlot,
  KaiTravelIntent,
} from "@/lib/services/kai/types";

type PlanKaiConversationInput = {
  intent: KaiTravelIntent;
  previousIntent?: KaiTravelIntent;
  lastAskedSlot?: KaiMissingSlot;
  latestUserMessage: string;
  channel: KaiChannel;
};

const requiredSlots = [
  "destination",
  "tripType",
  "guests",
  "dateWindow",
  "budget",
  "travellerName",
  "travellerEmail",
  "travellerPhone",
] as const;
const travelSlots = ["destination", "tripType", "guests", "dateWindow", "budget"] as const;
const contactSlots = ["travellerName", "travellerEmail", "travellerPhone"] as const;
const optionalUsefulSlots = ["interests"] as const;

export function planKaiConversation(input: PlanKaiConversationInput): KaiConversationPlan {
  const knownSlots = buildKnownSlots(input.intent);
  const missingSlots = buildMissingSlots(input.intent);
  const nextSlotToAsk = chooseNextSlot(missingSlots);
  const conversationStage = chooseStage(missingSlots);
  const instructionForReply = buildInstruction(input.intent, missingSlots);

  return {
    knownSlots,
    missingSlots,
    nextSlotToAsk,
    conversationStage,
    instructionForReply,
  };
}

function buildKnownSlots(intent: KaiTravelIntent) {
  const knownSlots: string[] = [];

  for (const slot of [
    ...requiredSlots,
    "certificationLevel",
    "selectedYachtSlug",
    ...optionalUsefulSlots,
  ]) {
    const value = intent[slot as keyof KaiTravelIntent];

    if (Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null) {
      knownSlots.push(slot);
    }
  }

  return knownSlots;
}

function buildMissingSlots(intent: KaiTravelIntent) {
  if (intent.unsupportedDestination) {
    return [];
  }

  const missingSlots: string[] = [];

  for (const slot of travelSlots) {
    if (!intent[slot]) {
      missingSlots.push(slot);
    }
  }

  for (const slot of contactSlots) {
    if (!intent[slot]) {
      missingSlots.push(slot);
    }
  }

  return missingSlots;
}

function chooseNextSlot(missingSlots: string[]) {
  return missingSlots[0];
}

function chooseStage(missingSlots: string[]) {
  if (missingSlots.length === 0) {
    return "ready_to_match";
  }

  return missingSlots.some((slot) => slot === "destination" || slot === "tripType")
    ? "discovery"
    : "qualification";
}

function buildInstruction(
  intent: KaiTravelIntent,
  missingSlots: string[],
) {
  if (intent.unsupportedDestination) {
    return "Explain BluePass is currently focused on Komodo and Raja Ampat liveaboards, then offer those two destinations.";
  }

  const knownSlots = buildKnownSlots(intent);
  const knownInstruction =
    knownSlots.length > 0
      ? `Do not ask again for known slots: ${knownSlots.join(", ")}.`
      : "No required travel slots are known yet.";

  if (missingSlots.length === 0) {
    return `${knownInstruction} Say Kai can start matching suitable Indonesia trips, but do not claim live availability, exact prices, or confirmed booking.`;
  }

  const slotsToAsk = chooseSlotsToAsk(missingSlots);
  const askInstruction = `Ask only for: ${slotsToAsk.join(", ")}.`;

  return `${knownInstruction} ${askInstruction} Ask at most one or two concise follow-up questions.`;
}

function chooseSlotsToAsk(missingSlots: string[]) {
  const missingContactSlots = contactSlots.filter((slot) => missingSlots.includes(slot));

  if (missingContactSlots.length > 0 && missingSlots[0] === missingContactSlots[0]) {
    return missingContactSlots;
  }

  return missingSlots.slice(0, 2);
}
