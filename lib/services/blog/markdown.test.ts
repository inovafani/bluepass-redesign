import { describe, expect, it } from "vitest";
import { articleStats, isInternalUrl, renderArticle, safeUrl, stripMarkdown } from "./markdown";

/**
 * Pure unit tests — no database, unlike most of `lib/services`. The renderer is the one piece of
 * this feature that turns author input into markup on a public page, so the cases that matter are
 * the ones where a mistake would be a security hole or a silently wrong SEO signal.
 */

describe("safeUrl", () => {
  it("accepts the schemes an article legitimately uses", () => {
    expect(safeUrl("https://example.com/a")).toBe("https://example.com/a");
    expect(safeUrl("/explore")).toBe("/explore");
    expect(safeUrl("#section")).toBe("#section");
    expect(safeUrl("mailto:hello@bluepass.co")).toBe("mailto:hello@bluepass.co");
  });

  it("rejects script-bearing schemes", () => {
    expect(safeUrl("javascript:alert(1)")).toBeNull();
    expect(safeUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(safeUrl("  JavaScript:alert(1)")).toBeNull();
  });
});

describe("isInternalUrl", () => {
  it("treats relative, in-page and bluepass.co links as internal", () => {
    expect(isInternalUrl("/conservation")).toBe(true);
    expect(isInternalUrl("#how-it-works")).toBe(true);
    expect(isInternalUrl("https://bluepass.co/blog")).toBe(true);
    expect(isInternalUrl("https://www.bluepass.co/")).toBe(true);
  });

  it("does not mistake a lookalike host for our own", () => {
    expect(isInternalUrl("https://bluepass.co.evil.com/x")).toBe(false);
    expect(isInternalUrl("https://notbluepass.co/x")).toBe(false);
  });
});

describe("renderArticle", () => {
  it("escapes HTML rather than passing it through", () => {
    const { html } = renderArticle("A <script>alert(1)</script> line");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("drops an unsafe href but keeps the words", () => {
    const { html } = renderArticle("Read [this](javascript:alert) now");
    expect(html).not.toContain("javascript:");
    expect(html).toContain("Read this now");
  });

  it("gives every heading an id and reports the same ids in the outline", () => {
    const { html, headings } = renderArticle("## Why Komodo\n\nText.\n\n## Why Komodo\n\nMore.");
    expect(headings.map((h) => h.id)).toEqual(["why-komodo", "why-komodo-2"]);
    expect(html).toContain('<h2 id="why-komodo"');
    expect(html).toContain('<h2 id="why-komodo-2"');
  });

  it("opens outbound links in a new tab and leaves internal ones alone", () => {
    const { html } = renderArticle("[out](https://example.com) and [in](/explore)");
    expect(html).toContain('<a href="https://example.com" target="_blank" rel="noopener noreferrer">out</a>');
    expect(html).toContain('<a href="/explore">in</a>');
  });

  it("keeps markdown inside a code fence literal", () => {
    const { html } = renderArticle("```\n**not bold**\n```");
    expect(html).toContain("**not bold**");
    expect(html).not.toContain("<strong>");
  });

  it("joins a soft-wrapped sentence into one paragraph", () => {
    const { html } = renderArticle("One line\nand its continuation.\n\nA second paragraph.");
    expect(html).toContain("<p>One line and its continuation.</p>");
    expect(html).toContain("<p>A second paragraph.</p>");
  });

  it("renders lists, quotes and rules", () => {
    const { html } = renderArticle("- one\n- two\n\n1. first\n\n> quoted\n\n---");
    expect(html).toContain("<ul class=\"bp-article__list\"><li>one</li><li>two</li></ul>");
    expect(html).toContain("<li>first</li>");
    expect(html).toContain("<blockquote");
    expect(html).toContain("<hr");
  });

  it("promotes a standalone image to a figure", () => {
    const { html } = renderArticle('![A reef](/reef.jpg "Shot on the outer reef")');
    expect(html).toContain("<figure");
    expect(html).toContain('alt="A reef"');
    expect(html).toContain("<figcaption>Shot on the outer reef</figcaption>");
  });
});

describe("articleStats", () => {
  it("counts the words a reader reads, not the markdown around them", () => {
    // Line structure survives - only the syntax around the words is removed, since the block
    // boundaries are what `firstParagraph` reads.
    expect(stripMarkdown("## Heading\n\n**Bold** and [linked](/x).")).toBe("Heading\n\nBold and linked.");
    expect(articleStats("**Bold** and [linked](/x).").wordCount).toBe(3);
  });

  it("separates internal from outbound links and ignores images", () => {
    const stats = articleStats("![pic](/a.jpg) [in](/explore) [out](https://example.com)");
    expect(stats.internalLinks).toBe(1);
    expect(stats.outboundLinks).toBe(1);
    expect(stats.imageCount).toBe(1);
  });

  it("finds the opening paragraph past a leading heading and image", () => {
    const stats = articleStats("## Title\n\n![hero](/h.jpg)\n\nThe real opening line.");
    expect(stats.firstParagraph).toBe("The real opening line.");
  });

  it("rounds reading time up to at least a minute for a non-empty article", () => {
    expect(articleStats("").readingMinutes).toBe(0);
    expect(articleStats("a few words here").readingMinutes).toBe(1);
    expect(articleStats(Array(2200).fill("word").join(" ")).readingMinutes).toBe(10);
  });
});
