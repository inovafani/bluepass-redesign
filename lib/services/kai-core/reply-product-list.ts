/**
 * Removes the enumerated product list from a Kai reply when the same products are already being
 * rendered as cards underneath it.
 *
 * Kai writes its reply as prose *plus* a numbered list ("1. Gold Coast Whale Escape - live
 * availability…") and separately returns the same products as `matches`. That was fine when the
 * cards were decoration; now that each card carries its own "Select this" button, the numbered list
 * is a second, unclickable copy of the same four options sitting directly above the real ones.
 *
 * Done here rather than in Kai's prompt on purpose. The list is genuinely useful on surfaces that
 * cannot draw cards — WhatsApp is the obvious one, and it shares this reply text — so the text
 * itself should keep it. What varies is whether the *renderer* has already shown those options,
 * which only the renderer knows.
 *
 * Returning an empty string is a legitimate outcome: when the reply was nothing but the list, the
 * cards say everything it said. This is only ever called when there are cards to render.
 */
export function stripDuplicatedProductList(reply: string, productNames: string[]): string {
  const names = productNames.map((name) => name.trim().toLowerCase()).filter(Boolean);

  if (!reply || names.length === 0) {
    return reply;
  }

  const lines = reply.split("\n");

  const isListedProduct = (line: string) => {
    const text = line.trim();
    /* Only ever a list item — a numbered or bulleted line. Prose that happens to mention a product
       ("Gold Coast Whale Escape is our most popular trip") is the reply doing real work, and must
       survive. */
    if (!/^(\d+[.)]|[-•*])\s+/.test(text)) {
      return false;
    }

    const body = text.replace(/^(\d+[.)]|[-•*])\s+/, "").toLowerCase();
    return names.some((name) => body.startsWith(name));
  };

  const removed = lines.map(isListedProduct);

  if (!removed.some(Boolean)) {
    return reply;
  }

  /**
   * A lead-in like "You can choose from:" goes whenever the list it introduced went — whether or
   * not more prose follows it.
   *
   * An earlier version only dropped it when nothing survived underneath, which real replies broke
   * immediately: Kai ends this message with "Which one sounds closest? Tell me your date too", so
   * the colon line was kept and left pointing at blank space with the closing question beneath it.
   * What it introduces now is the cards, which render after the text — so the words have to go,
   * even though the offer they make is still true.
   */
  const isOrphanedLeadIn = (index: number) => {
    if (!/:\s*$/.test(lines[index].trim())) {
      return false;
    }

    for (let i = index + 1; i < lines.length; i += 1) {
      if (!lines[i].trim()) continue;
      return removed[i];
    }

    return false;
  };

  const withoutList = lines
    .filter((_, index) => !removed[index] && !isOrphanedLeadIn(index))
    .join("\n")
    /* The removals leave behind the blank line that separated the prose from the list. */
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return dropChoosePrompt(withoutList);
}

/**
 * Asking "which one sounds closest? Tell me your date too" only made sense when the list was text
 * the traveller had to answer in prose.
 *
 * Two things are wrong with keeping it now. The choosing is done by the cards' own "Select this",
 * so the question points at nothing; and it asks for a date *before* a trip is picked, which is the
 * opposite of the order the flow actually runs in — Kai asks for the date after a selection, and
 * the cards already say "Share your date for pricing" for the same reason.
 *
 * Scoped to the closing block and to an explicit set of choose-prompts, so ordinary prose is never
 * touched. It is the one paragraph whose whole job was to operate a list that no longer exists.
 */
function dropChoosePrompt(text: string) {
  const blocks = text.split(/\n\s*\n/);
  const last = blocks[blocks.length - 1]?.trim() ?? "";

  const isChoosePrompt =
    /\b(which one|which of (these|them)|pick one|let me know which|sounds closest|take your pick)\b/i.test(
      last,
    );

  if (!isChoosePrompt) {
    return text;
  }

  return blocks.slice(0, -1).join("\n\n").trim();
}
