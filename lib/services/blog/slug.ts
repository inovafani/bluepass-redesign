/**
 * Slugs, in one place.
 *
 * A slug is the article's permanent address, so this file is deliberately boring: lowercase,
 * ASCII, hyphen-separated, no trailing punctuation. Two rules are worth stating because they are
 * the ones that bite later:
 *
 *  - Accented and non-Latin characters are folded rather than dropped where NFD can do it
 *    ("Menyelam di Komodo" keeps every word). What cannot be folded is dropped, which is why the
 *    editor always shows the resulting slug rather than trusting the title.
 *  - Nothing here guarantees uniqueness on its own. `uniqueSlug` takes the set of slugs already in
 *    use and suffixes a counter, because "unique" is a database fact, not a string fact.
 */

const MAX_SLUG_LENGTH = 96;

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    // Strip combining marks left behind by NFD, so "é" becomes "e" rather than disappearing.
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, "");
}

/**
 * The slug to actually save, given everything already taken.
 *
 * `taken` is expected to exclude the post being edited — re-saving a post without touching its
 * title must not walk it to `-2`, which would break every link already pointing at it.
 */
export function uniqueSlug(desired: string, taken: Iterable<string>): string {
  const base = slugify(desired) || "post";
  const used = new Set(taken);

  if (!used.has(base)) return base;

  for (let n = 2; n < 1000; n += 1) {
    const candidate = `${base}-${n}`;
    if (!used.has(candidate)) return candidate;
  }

  // A thousand collisions on one title is not a real editorial situation; falling back to a
  // timestamp is still better than returning a slug we know is taken.
  return `${base}-${Date.now()}`;
}

/** Heading anchors. Same rules as a post slug, but allowed to be short and repeated. */
export function headingId(text: string, used: Set<string>): string {
  const base = slugify(text) || "section";
  let candidate = base;
  let n = 2;

  while (used.has(candidate)) {
    candidate = `${base}-${n}`;
    n += 1;
  }

  used.add(candidate);
  return candidate;
}
