import { describe, expect, it } from "vitest";
import { stripDuplicatedProductList } from "./reply-product-list";

const AU_NAMES = [
  "Gold Coast Whale Escape",
  "Twilight Drift",
  "Broadwater Twilight Dining",
  "Coastal Lunch Escape",
];

describe("stripDuplicatedProductList", () => {
  /** The exact reply Kai returns today for "I want a Gold Coast boat trip". */
  it("removes the numbered list and its lead-in, keeping the real sentence", () => {
    const reply = [
      "Great choice! Connecting you with Boattime Yacht Charters now.",
      "",
      "You can choose from:",
      "1. Gold Coast Whale Escape - live availability",
      "2. Twilight Drift - live availability",
      "3. Broadwater Twilight Dining - live availability",
      "4. Coastal Lunch Escape - live availability",
    ].join("\n");

    expect(stripDuplicatedProductList(reply, AU_NAMES)).toBe(
      "Great choice! Connecting you with Boattime Yacht Charters now.",
    );
  });

  it("leaves a reply alone when there are no cards to duplicate", () => {
    const reply = "You can choose from:\n1. Gold Coast Whale Escape - live availability";
    expect(stripDuplicatedProductList(reply, [])).toBe(reply);
  });

  /**
   * The line that matters most. Prose naming a product is Kai answering a question, not a menu —
   * stripping it would delete the reply's actual content.
   */
  it("keeps prose that mentions a product without listing it", () => {
    const reply = "Gold Coast Whale Escape is the one with live availability today.";
    expect(stripDuplicatedProductList(reply, AU_NAMES)).toBe(reply);
  });

  it("keeps list items that are not products", () => {
    const reply = [
      "A few things to know:",
      "1. Bring sunscreen",
      "2. Gold Coast Whale Escape - live availability",
    ].join("\n");

    const out = stripDuplicatedProductList(reply, AU_NAMES);
    expect(out).toContain("Bring sunscreen");
    expect(out).toContain("A few things to know:");
    expect(out).not.toContain("live availability");
  });

  it("handles bulleted lists as well as numbered ones", () => {
    const reply = ["Options:", "- Twilight Drift - live availability", "• Coastal Lunch Escape"].join("\n");
    expect(stripDuplicatedProductList(reply, AU_NAMES)).toBe("");
  });

  it("matches product names case-insensitively", () => {
    const reply = "Pick one:\n1. gold coast whale escape - live availability";
    expect(stripDuplicatedProductList(reply, AU_NAMES)).toBe("");
  });

  /* A reply that was nothing but the list becomes empty, and that is correct: the cards carry the
     same four options with a button each. Keeping the text would preserve the duplication. */
  it("returns empty when the reply was only the product list", () => {
    const reply = "1. Gold Coast Whale Escape - live availability";
    expect(stripDuplicatedProductList(reply, AU_NAMES)).toBe("");
  });

  /**
   * The real shape of Kai's AU reply: prose, lead-in, list, then a closing question. The lead-in
   * has to go even though prose follows it — what it introduces is now the cards below the text.
   */
  it("drops an orphaned lead-in even when prose follows it", () => {
    const reply = [
      "Great choice! Connecting you with Boattime Yacht Charters now.",
      "",
      "You can choose from:",
      "1. Gold Coast Whale Escape - live availability",
      "2. Twilight Drift - live availability",
      "",
      "Which one sounds closest? Tell me your date too and I'll check pricing.",
    ].join("\n");

    /* The closing prompt goes too: the cards do the choosing, and the date is asked after a trip
       is picked, not before. */
    expect(stripDuplicatedProductList(reply, AU_NAMES)).toBe(
      "Great choice! Connecting you with Boattime Yacht Charters now.",
    );
  });

  it("drops the closing choose-and-date prompt, which the cards have taken over", () => {
    const reply = [
      "Here are some options.",
      "",
      "1. Twilight Drift - live availability",
      "",
      "Which one sounds closest? Tell me your date too and I'll check pricing.",
    ].join("\n");

    expect(stripDuplicatedProductList(reply, AU_NAMES)).toBe("Here are some options.");
  });

  /* Only the closing prompt, and only when it is one. Ordinary prose that happens to end the
     message must survive — this is a display tweak, not a licence to rewrite Kai. */
  it("keeps a closing sentence that is not a choose-prompt", () => {
    const reply = [
      "Here are some options.",
      "",
      "1. Twilight Drift - live availability",
      "",
      "Boattime has been running these for fifteen years.",
    ].join("\n");

    const out = stripDuplicatedProductList(reply, AU_NAMES);
    expect(out).toContain("fifteen years");
  });

  it("keeps a colon line whose list was not a product list", () => {
    const reply = ["A few things to know:", "1. Bring sunscreen", "2. Arrive 15 minutes early"].join("\n");
    expect(stripDuplicatedProductList(reply, AU_NAMES)).toBe(reply);
  });
});
