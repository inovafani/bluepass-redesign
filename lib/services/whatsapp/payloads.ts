export type OperatorButtonAction = "accept" | "decline" | "counter";

export type OperatorButtonPayload =
  | {
      action: OperatorButtonAction;
      bookingId: string;
      source: "structured_payload";
    }
  | {
      action: OperatorButtonAction;
      bookingId: null;
      source: "button_text";
    };

const operatorButtonActions = new Set<OperatorButtonAction>([
  "accept",
  "decline",
  "counter",
]);

const buttonTextActionMap: Record<string, OperatorButtonAction> = {
  accept: "accept",
  decline: "decline",
  counter: "counter",
  "counter-offer": "counter",
};

export function parseOperatorButtonPayload(payload: string): OperatorButtonPayload {
  const trimmed = payload.trim();

  if (!trimmed) {
    throw new Error("Invalid operator button payload: payload is empty.");
  }

  const separatorIndex = trimmed.indexOf(":");
  if (separatorIndex < 0) {
    const buttonTextAction = buttonTextActionMap[trimmed.toLowerCase()];
    if (!buttonTextAction) {
      throw new Error(`Invalid operator button payload action: ${trimmed}.`);
    }

    return {
      action: buttonTextAction,
      bookingId: null,
      source: "button_text",
    };
  }

  const action = trimmed.slice(0, separatorIndex).trim();
  const bookingId = trimmed.slice(separatorIndex + 1).trim();

  if (!operatorButtonActions.has(action as OperatorButtonAction)) {
    throw new Error(`Invalid operator button payload action: ${action}.`);
  }

  if (!bookingId) {
    throw new Error("Invalid operator button payload: bookingId is required.");
  }

  return {
    action: action as OperatorButtonAction,
    bookingId,
    source: "structured_payload",
  };
}
