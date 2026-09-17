import { describe, expect, it } from "vitest";
import { analyseSeo, effectiveMetaDescription, effectiveSeoTitle, type SeoInput } from "./seo";
import { slugify, uniqueSlug } from "./slug";

const BASE: SeoInput = {
  title: "",
  slug: "",
  body: "",
  excerpt: "",
  focusKeyword: "",
  seoTitle: "",
  metaDescription: "",
  heroImageUrl: "",
  heroImageAlt: "",
  categoryId: "",
  tags: [],
};

const stateOf = (input: Partial<SeoInput>, id: string) =>
  analyseSeo({ ...BASE, ...input }).checks.find((check) => check.id === id)?.state;

describe("slugify", () => {
  it("folds accents instead of dropping the word", () => {
    expect(slugify("Menyelam di Cenderawasih")).toBe("menyelam-di-cenderawasih");
    expect(slugify("Rosé & Reefs")).toBe("rose-reefs");
  });

  it("never leaves a leading or trailing hyphen", () => {
    expect(slugify("  --Hello, world!--  ")).toBe("hello-world");
  });
});

describe("uniqueSlug", () => {
  it("returns the base slug when nothing has claimed it", () => {
    expect(uniqueSlug("Best Dive Sites", [])).toBe("best-dive-sites");
  });

  it("suffixes a counter past a collision", () => {
    expect(uniqueSlug("Best Dive Sites", ["best-dive-sites", "best-dive-sites-2"])).toBe("best-dive-sites-3");
  });
});

describe("analyseSeo", () => {
  it("fails the keyword check first, because everything else depends on it", () => {
    expect(stateOf({}, "focus-keyword")).toBe("fail");
    expect(analyseSeo(BASE).checks.some((check) => check.id === "keyword-in-title")).toBe(false);
  });

  it("matches a keyword across punctuation and case", () => {
    expect(
      stateOf({ focusKeyword: "506(b)", seoTitle: "Rule 506 b explained for founders" }, "keyword-in-title"),
    ).toBe("pass");
  });

  it("does not punish an author for bolding the phrase they were told to emphasise", () => {
    expect(
      stateOf({ focusKeyword: "liveaboard komodo", body: "A **liveaboard Komodo** trip starts here." }, "keyword-in-intro"),
    ).toBe("pass");
  });

  it("treats title length as a range, not a cliff", () => {
    expect(stateOf({ title: "Short" }, "title-length")).toBe("warn");
    expect(stateOf({ title: "A search title of precisely the right sort of length" }, "title-length")).toBe("pass");
    expect(stateOf({ title: "x".repeat(90) }, "title-length")).toBe("warn");
    expect(stateOf({}, "title-length")).toBe("fail");
  });

  it("counts only H2s as structure and requires real internal linking", () => {
    const body = "## One\n\n### Nested\n\n## Two\n\n## Three\n\n[a](/explore) [b](/conservation)";
    expect(stateOf({ body }, "subheadings")).toBe("pass");
    expect(stateOf({ body }, "internal-links")).toBe("pass");
    expect(stateOf({ body: "[a](/explore)" }, "internal-links")).toBe("warn");
    expect(stateOf({ body: "no links" }, "internal-links")).toBe("fail");
  });

  it("warns on a featured image with no alt text rather than passing it", () => {
    expect(stateOf({ heroImageUrl: "/h.jpg" }, "featured-image")).toBe("warn");
    expect(stateOf({ heroImageUrl: "/h.jpg", heroImageAlt: "A reef" }, "featured-image")).toBe("pass");
    expect(stateOf({}, "featured-image")).toBe("fail");
  });

  it("scores an empty post at zero and a complete one near the top", () => {
    expect(analyseSeo(BASE).grade).toBe("Not started");
    expect(analyseSeo(BASE).score).toBeLessThan(25);

    const complete = analyseSeo({
      title: "How to pick a liveaboard in Komodo without guessing",
      slug: "how-to-pick-a-liveaboard-in-komodo",
      focusKeyword: "liveaboard komodo",
      seoTitle: "How to pick a liveaboard Komodo trip without guessing",
      metaDescription:
        "A liveaboard Komodo trip is worth getting right. Here is how to read the boat, the crew and the itinerary before you pay a deposit.",
      excerpt: "What to check before you book.",
      heroImageUrl: "/h.jpg",
      heroImageAlt: "A liveaboard at anchor",
      categoryId: "cat_1",
      tags: ["komodo", "diving"],
      body: [
        "A liveaboard Komodo trip lives or dies on the boat you pick.",
        "",
        "## Read the boat",
        Array(400).fill("word").join(" "),
        "## Read the crew",
        Array(400).fill("word").join(" "),
        "## Read the itinerary",
        Array(300).fill("word").join(" "),
        "See our [Komodo trips](/explore) and the [conservation split](/conservation).",
        "Certification levels come from [PADI](https://www.padi.com).",
      ].join("\n\n"),
    });

    expect(complete.score).toBeGreaterThanOrEqual(90);
    expect(complete.grade).toBe("Ready to rank");
  });
});

describe("fallbacks", () => {
  it("falls back title -> article title", () => {
    expect(effectiveSeoTitle({ seoTitle: "", title: "The article" })).toBe("The article");
    expect(effectiveSeoTitle({ seoTitle: "The search title", title: "The article" })).toBe("The search title");
  });

  it("falls back description -> excerpt -> the opening of the body, cut on a word boundary", () => {
    expect(effectiveMetaDescription({ metaDescription: "", excerpt: "The excerpt", body: "Body" })).toBe("The excerpt");

    const long = effectiveMetaDescription({ metaDescription: "", excerpt: "", body: `${"word ".repeat(80)}end` });
    expect(long.length).toBeLessThanOrEqual(160);
    expect(long.endsWith("…")).toBe(true);
    expect(long).not.toMatch(/\s…$/);
  });
});
