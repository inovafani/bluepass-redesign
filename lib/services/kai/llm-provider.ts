import type {
  KaiChannel,
  KaiConversationPlan,
  KaiConversationMessage,
  KaiMissingSlot,
  KaiTravelIntent,
  YachtMatch,
} from "@/lib/services/kai/types";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const GROQ_CHAT_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_OPENAI_MODEL = "gpt-4.1-mini";
const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";

export type GenerateKaiReplyInput = {
  messages: KaiConversationMessage[];
  intent: KaiTravelIntent;
  missingSlots?: KaiMissingSlot[];
  channel: KaiChannel;
  deterministicReply: string;
  planner?: KaiConversationPlan;
  matches?: YachtMatch[];
};

type OpenAIResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
  }>;
};

type GroqChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: unknown;
    };
  }>;
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
};

export async function generateKaiReply(input: GenerateKaiReplyInput): Promise<string> {
  if (!isKaiLlmEnabled()) {
    return input.deterministicReply;
  }

  const provider = resolveKaiLlmProvider();

  if (provider === "openai") {
    return generateOpenAIReply(input);
  }

  if (provider === "groq") {
    return generateGroqReply(input);
  }

  console.warn("Kai LLM provider is unsupported; using deterministic fallback.");
  return input.deterministicReply;
}

export function isKaiLlmEnabled() {
  return process.env.KAI_LLM_ENABLED === "true";
}

function resolveKaiLlmProvider() {
  return process.env.KAI_LLM_PROVIDER ?? "openai";
}

function resolveKaiLlmModel(defaultModel: string) {
  return process.env.KAI_LLM_MODEL ?? defaultModel;
}

function buildKaiSystemInstructions() {
  return [
    "You are Kai, the BluePass marine travel concierge.",
    "BluePass is currently focused on Komodo and Raja Ampat liveaboards only.",
    "Lead with liveaboards. For liveaboard style, use diving, cruising, or mixed diving/cruising language.",
    "Do not promote sailing, eco resorts, or expedition-style trips as discovery options.",
    "Supported destinations are Komodo and Raja Ampat only for now.",
    "Kai can help discover suitable trips, but cannot yet confirm live availability, make bookings, place PMS holds, contact operators, collect payment, or confirm reservations.",
    "Use the extracted intent as structured context. Do not invent facts, prices, availability, operators, booking status, or payment links.",
    "If yacht suggestions are provided, they come only from the static BluePass preview catalog. Do not invent additional yachts.",
    "Do not claim real-time availability. Do not say available now, confirmed, booked, or operator accepted unless that state exists.",
    "Do not quote yacht prices as final. Treat them as preview catalog price signals only.",
    "Website chat alone does not create or send inquiries. If the user asks to proceed, say Kai can help prepare an inquiry and ask them to use the explicit inquiry action; do not say you have prepared, created, sent, or will send an inquiry unless the structured context includes an actual inquiry result.",
    "Follow the provided planner.instructionForReply exactly. The planner is the source of truth for which slots are known and missing.",
    "Do not ask for any slot listed in planner.knownSlots unless the user clearly corrected it in their latest message.",
    "If the user asks for any destination outside Komodo or Raja Ampat, explain BluePass is currently focused on Komodo and Raja Ampat liveaboards only.",
    "Do not ask for certification level as a required slot. If the traveller volunteers it, use it as optional context.",
    "Ask one or two useful follow-up questions at a time, based on missing travel details.",
    "Keep replies calm, premium, concise, helpful, and short enough for a website chat UI.",
  ].join("\n");
}

function buildOpenAIInput(input: GenerateKaiReplyInput) {
  const context = {
    channel: input.channel,
    intent: input.intent,
    missingSlots: input.missingSlots ?? input.intent.missingSlots ?? [],
    planner: input.planner,
    matches: input.matches ?? [],
    stateCard: buildStateCard(input),
    deterministicFallbackReply: input.deterministicReply,
  };
  const recentMessages = input.messages.slice(-8).map((message) => ({
    role: message.role === "assistant" ? "assistant" : "user",
    content: message.content,
  }));

  return [
    {
      role: "user",
      content: `Structured Kai context:\n${JSON.stringify(context, null, 2)}`,
    },
    ...recentMessages,
  ];
}

function buildGroqMessages(input: GenerateKaiReplyInput) {
  const context = {
    channel: input.channel,
    intent: input.intent,
    missingSlots: input.missingSlots ?? input.intent.missingSlots ?? [],
    planner: input.planner,
    matches: input.matches ?? [],
    stateCard: buildStateCard(input),
    deterministicFallbackReply: input.deterministicReply,
  };
  const recentMessages = input.messages.slice(-8).map((message) => ({
    role: message.role === "assistant" ? "assistant" : "user",
    content: message.content,
  }));

  return [
    {
      role: "system",
      content: buildKaiSystemInstructions(),
    },
    {
      role: "user",
      content: `Structured Kai context:\n${JSON.stringify(context, null, 2)}`,
    },
    ...recentMessages,
  ];
}

function buildStateCard(input: GenerateKaiReplyInput) {
  return {
    "Destination": input.intent.destination ?? "missing",
    "Trip type": input.intent.tripType ?? "missing",
    "Guests": input.intent.guests ?? "missing",
    "Date window": input.intent.dateWindow ?? "missing",
    "Certification level (optional)": input.intent.certificationLevel ?? "missing",
    "Budget": input.intent.budget ?? "missing",
    "Known slots": input.planner?.knownSlots ?? [],
    "Missing slots": input.planner?.missingSlots ?? input.missingSlots ?? [],
    "Next slot to ask": input.planner?.nextSlotToAsk ?? "none",
    "Instruction": input.planner?.instructionForReply ?? "Use deterministic missing slots.",
    "Yacht suggestions": input.matches?.map((match) => ({
      slug: match.slug,
      name: match.name,
      region: match.region,
      tier: match.tier,
      cabinBookable: match.cabinBookable,
      maxGuests: match.maxGuests,
      cabins: match.cabins,
      pricePerCabin: match.pricePerCabin,
      charterPrice: match.charterPrice,
      charterOnly: match.charterOnly,
      matchingReasons: match.matchingReasons,
      departuresPreview: match.departuresPreview,
      score: match.score,
      heroImageUrl: match.heroImageUrl,
    })) ?? [],
    "Yacht suggestion constraints":
      "Static BluePass preview catalog only; no invented yachts, live availability, final prices, confirmed bookings, operator acceptance, or automatic inquiry dispatch from chat. Proceeding requires an explicit inquiry action.",
  };
}

async function generateOpenAIReply(input: GenerateKaiReplyInput) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return input.deterministicReply;
  }

  try {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: resolveKaiLlmModel(DEFAULT_OPENAI_MODEL),
        instructions: buildKaiSystemInstructions(),
        input: buildOpenAIInput(input),
        max_output_tokens: 220,
      }),
    });

    if (!response.ok) {
      console.warn(`Kai LLM request failed with status ${response.status}; using fallback.`);
      return input.deterministicReply;
    }

    const body = (await response.json()) as OpenAIResponse;
    const reply = extractOpenAIText(body);

    if (!reply) {
      return input.deterministicReply;
    }

    console.info("kai.llm.openai.success", {
      provider: "openai",
      model: resolveKaiLlmModel(DEFAULT_OPENAI_MODEL),
      status: response.status,
      replyLength: reply.length,
    });

    return reply;
  } catch (error) {
    console.warn("Kai LLM request failed; using deterministic fallback.", {
      error: error instanceof Error ? error.message : "unknown error",
    });
    return input.deterministicReply;
  }
}

async function generateGroqReply(input: GenerateKaiReplyInput) {
  const apiKey = process.env.GROQ_API_KEY;
  const model = resolveKaiLlmModel(DEFAULT_GROQ_MODEL);

  if (!apiKey) {
    return input.deterministicReply;
  }

  try {
    const response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: buildGroqMessages(input),
        max_tokens: 220,
      }),
    });

    if (!response.ok) {
      const errorBody = await readGroqErrorBody(response);
      console.warn("kai.llm.groq.error", {
        status: response.status,
        message: errorBody?.error?.message,
        type: errorBody?.error?.type,
        code: errorBody?.error?.code,
        requestId: getResponseHeader(response, "x-request-id"),
      });
      return input.deterministicReply;
    }

    const body = (await response.json()) as GroqChatCompletionResponse;
    const reply = extractGroqText(body);

    if (!reply) {
      console.warn("kai.llm.groq.malformed_response", {
        status: response.status,
        requestId: getResponseHeader(response, "x-request-id"),
      });
      return input.deterministicReply;
    }

    console.info("kai.llm.groq.success", {
      provider: "groq",
      model,
      status: response.status,
      replyLength: reply.length,
    });

    return reply;
  } catch (error) {
    console.warn("kai.llm.groq.error", {
      message: error instanceof Error ? error.message : "unknown error",
    });
    return input.deterministicReply;
  }
}

function extractOpenAIText(response: OpenAIResponse) {
  if (typeof response.output_text === "string") {
    return response.output_text.trim();
  }

  const text = response.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text)
    .filter((value): value is string => typeof value === "string")
    .join("\n")
    .trim();

  return text;
}

function extractGroqText(response: GroqChatCompletionResponse) {
  const content = response.choices?.[0]?.message?.content;

  if (typeof content !== "string") {
    return undefined;
  }

  const reply = content.trim();

  return reply.length > 0 ? reply : undefined;
}

async function readGroqErrorBody(response: Response): Promise<GroqChatCompletionResponse | undefined> {
  try {
    return (await response.json()) as GroqChatCompletionResponse;
  } catch {
    return undefined;
  }
}

function getResponseHeader(response: Response, name: string) {
  try {
    return response.headers?.get(name) ?? undefined;
  } catch {
    return undefined;
  }
}
