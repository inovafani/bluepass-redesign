import { articleStats, type ArticleStats } from "./markdown";

/**
 * The editor's SEO checklist.
 *
 * This is the opinionated part of the CMS, and the reason it exists at all: the goal is not "a
 * blog", it is page one of Google for anyone searching Bluepass. So the editor refuses to let an
 * article be written blind. Every check below is something that measurably changes whether a page
 * ranks, phrased as a thing to fix rather than a score to admire.
 *
 * Three deliberate design decisions:
 *
 *  - **Pure and isomorphic.** No Prisma, no `window`, no Node built-ins — the browser recomputes
 *    this on every keystroke while the server recomputes it on save, and both must agree. A check
 *    that only ran on save would tell an author they were wrong after they had stopped writing.
 *  - **Three states, not two.** `warn` exists because most SEO advice is a range, not a rule. A
 *    140-word intro is not a failure the way a missing meta description is, and colouring them
 *    identically trains people to ignore the list.
 *  - **Nothing here blocks publishing.** The checklist is advice. An announcement post that will
 *    never rank should still be publishable without lying to the form.
 */

export type SeoCheckState = "pass" | "warn" | "fail";

export type SeoCheck = {
  id: string;
  label: string;
  state: SeoCheckState;
  /** What to do about it, in one line, written for the person holding the keyboard. */
  detail: string;
};

export type SeoReport = {
  checks: SeoCheck[];
  /** 0-100. A `warn` counts half — the bar should be reachable without being gamed. */
  score: number;
  passed: number;
  total: number;
  /** The headline verdict the editor prints next to the ring. */
  grade: "Not started" | "Needs work" | "Nearly there" | "Ready to rank";
  stats: ArticleStats;
};

export type SeoInput = {
  title: string;
  slug: string;
  body: string;
  excerpt: string;
  focusKeyword: string;
  seoTitle: string;
  metaDescription: string;
  heroImageUrl: string;
  heroImageAlt: string;
  categoryId: string;
  tags: string[];
};

/* Google truncates the blue link around 580px, which is roughly 60 characters, and the snippet
   around 160. Both are soft limits — these are the ranges the editor nudges toward. */
export const SEO_TITLE_MIN = 30;
export const SEO_TITLE_MAX = 60;
export const SEO_TITLE_HARD_MAX = 70;
export const META_DESCRIPTION_MIN = 70;
export const META_DESCRIPTION_MAX = 160;
/* Long-form comfortably out-ranks thin pages on the informational queries this blog targets.
   900 is the "this is a real article" line; 500 is the "this is a note" line. */
export const TARGET_WORD_COUNT = 900;
export const MINIMUM_WORD_COUNT = 500;

/** Case- and punctuation-insensitive containment, so "506(b)" matches "506 b" in a title. */
function containsPhrase(haystack: string, phrase: string): boolean {
  const normalise = (value: string) =>
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

  const needle = normalise(phrase);
  if (!needle) return false;
  return normalise(haystack).includes(needle);
}

export function effectiveSeoTitle(input: Pick<SeoInput, "seoTitle" | "title">): string {
  return (input.seoTitle || input.title).trim();
}

export function effectiveMetaDescription(
  input: Pick<SeoInput, "metaDescription" | "excerpt" | "body">,
): string {
  const chosen = input.metaDescription.trim() || input.excerpt.trim();
  if (chosen) return chosen;

  // Last resort so a published post is never snippet-less: the opening of the article, cut on a
  // word boundary. The checklist still reports this as a miss — Google inventing its own snippet
  // is usually worse than a written one.
  const opening = articleStats(input.body).firstParagraph;
  if (opening.length <= META_DESCRIPTION_MAX) return opening;
  return `${opening.slice(0, META_DESCRIPTION_MAX - 1).replace(/\s+\S*$/, "")}…`;
}

export function analyseSeo(input: SeoInput): SeoReport {
  const stats = articleStats(input.body);
  const keyword = input.focusKeyword.trim();
  const seoTitle = effectiveSeoTitle(input);
  const metaDescription = input.metaDescription.trim();
  const checks: SeoCheck[] = [];

  const add = (id: string, label: string, state: SeoCheckState, detail: string) =>
    checks.push({ id, label, state, detail });

  /* Focus keyword ------------------------------------------------------------------------- */
  add(
    "focus-keyword",
    "Focus keyword",
    keyword ? "pass" : "fail",
    keyword
      ? `Targeting “${keyword}”. Check no other Bluepass article is already chasing this phrase.`
      : "Not set. Pick the one phrase this article should win — every check below depends on it.",
  );

  if (keyword) {
    add(
      "keyword-in-title",
      "Keyword in the title",
      containsPhrase(seoTitle, keyword) ? "pass" : "fail",
      containsPhrase(seoTitle, keyword)
        ? "The search title contains the phrase."
        : `“${keyword}” is missing from the search title. It is the single strongest on-page signal.`,
    );

    const introMatch = containsPhrase(stats.firstParagraph, keyword);
    add(
      "keyword-in-intro",
      "Keyword in the opening",
      introMatch ? "pass" : stats.firstParagraph ? "warn" : "fail",
      introMatch
        ? "The phrase appears in the opening paragraph."
        : stats.firstParagraph
          ? "Work the phrase into the first paragraph — that is where a reader confirms they are in the right place."
          : "There is no opening paragraph yet.",
    );

    add(
      "keyword-in-slug",
      "Keyword in the URL",
      containsPhrase(input.slug.replace(/-/g, " "), keyword) ? "pass" : "warn",
      containsPhrase(input.slug.replace(/-/g, " "), keyword)
        ? "The URL carries the phrase."
        : "The URL does not contain the phrase. Worth fixing now — changing it after publishing breaks every link.",
    );

    add(
      "keyword-in-meta",
      "Keyword in the description",
      containsPhrase(metaDescription, keyword) ? "pass" : "warn",
      containsPhrase(metaDescription, keyword)
        ? "The phrase appears in the meta description."
        : "Google bolds the searched phrase in the snippet. Use it once in the description.",
    );
  }

  /* Search appearance --------------------------------------------------------------------- */
  const titleLength = seoTitle.length;
  add(
    "title-length",
    "Search title length",
    titleLength === 0
      ? "fail"
      : titleLength < SEO_TITLE_MIN || titleLength > SEO_TITLE_HARD_MAX
        ? "warn"
        : titleLength > SEO_TITLE_MAX
          ? "warn"
          : "pass",
    titleLength === 0
      ? "Empty. Falls back to the article title once you write one."
      : titleLength < SEO_TITLE_MIN
        ? `${titleLength} characters — short enough that you are leaving room unused. Aim for ${SEO_TITLE_MIN}-${SEO_TITLE_MAX}.`
        : titleLength > SEO_TITLE_MAX
          ? `${titleLength} characters — Google will cut it around ${SEO_TITLE_MAX}. Put the important half first.`
          : `${titleLength} characters. Fits.`,
  );

  const metaLength = metaDescription.length;
  add(
    "meta-length",
    "Meta description",
    metaLength === 0
      ? "fail"
      : metaLength < META_DESCRIPTION_MIN || metaLength > META_DESCRIPTION_MAX
        ? "warn"
        : "pass",
    metaLength === 0
      ? "Empty. Google will invent a snippet from the page, and it is usually worse than yours."
      : metaLength < META_DESCRIPTION_MIN
        ? `${metaLength} characters — room for another clause about what the reader gets.`
        : metaLength > META_DESCRIPTION_MAX
          ? `${metaLength} characters — will be truncated around ${META_DESCRIPTION_MAX}.`
          : `${metaLength} characters. Fits.`,
  );

  /* The article itself -------------------------------------------------------------------- */
  add(
    "length",
    "Article length",
    stats.wordCount >= TARGET_WORD_COUNT
      ? "pass"
      : stats.wordCount >= MINIMUM_WORD_COUNT
        ? "warn"
        : "fail",
    stats.wordCount === 0
      ? "Nothing written yet."
      : stats.wordCount >= TARGET_WORD_COUNT
        ? `${stats.wordCount} words — enough to answer the question properly.`
        : `${stats.wordCount} words. Informational queries are won by the page that answers completely; aim past ${TARGET_WORD_COUNT}.`,
  );

  add(
    "subheadings",
    "Subheadings",
    stats.headingCount >= 3 ? "pass" : stats.headingCount >= 1 ? "warn" : "fail",
    stats.headingCount === 0
      ? "None. H2s are how Google reads the structure of the page — and how a reader skims it."
      : stats.headingCount >= 3
        ? `${stats.headingCount} H2 sections.`
        : `${stats.headingCount} H2 so far. Break the article into the questions it actually answers.`,
  );

  add(
    "internal-links",
    "Internal links",
    stats.internalLinks >= 2 ? "pass" : stats.internalLinks === 1 ? "warn" : "fail",
    stats.internalLinks === 0
      ? "None. Link to at least two Bluepass pages — that is what turns a blog into traffic that books."
      : stats.internalLinks === 1
        ? "One internal link. Add another: the trip, the operator, or a related article."
        : `${stats.internalLinks} internal links.`,
  );

  add(
    "outbound-links",
    "Outbound links",
    stats.outboundLinks >= 1 ? "pass" : "warn",
    stats.outboundLinks >= 1
      ? `${stats.outboundLinks} cited source${stats.outboundLinks === 1 ? "" : "s"}.`
      : "No sources cited. A page that links nothing reads as a page that knows nothing.",
  );

  /* Presentation -------------------------------------------------------------------------- */
  const hasHero = Boolean(input.heroImageUrl.trim());
  const hasAlt = Boolean(input.heroImageAlt.trim());
  add(
    "featured-image",
    "Featured image",
    hasHero && hasAlt ? "pass" : hasHero ? "warn" : "fail",
    !hasHero
      ? "None. Every share on WhatsApp, LinkedIn and X falls back to a bare link without one."
      : hasAlt
        ? "Set, with alt text."
        : "Set, but it has no alt text — that is a free ranking signal and an accessibility miss.",
  );

  add(
    "excerpt",
    "Excerpt",
    input.excerpt.trim() ? "pass" : "warn",
    input.excerpt.trim()
      ? "Written. This is the card on /blog, not the Google snippet."
      : "Empty. The listing card will fall back to the opening of the article.",
  );

  add(
    "category",
    "Category",
    input.categoryId ? "pass" : "warn",
    input.categoryId
      ? "Filed. The category archive is an extra indexable page pointing at this one."
      : "Unfiled. Categories give this article a second route in from search.",
  );

  add(
    "tags",
    "Tags",
    input.tags.length >= 2 ? "pass" : "warn",
    input.tags.length === 0
      ? "None. Tags are the related-article signal on the public page."
      : `${input.tags.length} tag${input.tags.length === 1 ? "" : "s"}.`,
  );

  const weight = checks.reduce(
    (sum, check) => sum + (check.state === "pass" ? 1 : check.state === "warn" ? 0.5 : 0),
    0,
  );
  const score = checks.length === 0 ? 0 : Math.round((weight / checks.length) * 100);
  const passed = checks.filter((check) => check.state === "pass").length;

  /* A blank post still scores a little, because a few checks are only ever advisory (tags,
     outbound links) and warn rather than fail. Reporting that as "Needs work" would be dishonest
     about a page nobody has written yet — an untouched draft gets its own grade. */
  const untouched = !input.title.trim() && !input.body.trim();

  return {
    checks,
    score,
    passed,
    total: checks.length,
    grade: untouched
      ? "Not started"
      : score < 55
        ? "Needs work"
        : score < 85
          ? "Nearly there"
          : "Ready to rank",
    stats,
  };
}
