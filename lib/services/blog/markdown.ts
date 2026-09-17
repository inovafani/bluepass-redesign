import { headingId } from "./slug";

/**
 * The article renderer.
 *
 * Bodies are stored as Markdown and turned into HTML here, server-side, on read. Two constraints
 * shaped this file:
 *
 *  1. **No raw HTML passes through.** Everything is escaped before any tag is emitted, and the
 *     only tags that exist in the output are the ones this file writes. Admins are trusted, but
 *     "trusted" is an account state that can change; an editor that can inject a script tag into
 *     every visitor's page is a stored-XSS hole waiting for one compromised login.
 *  2. **Headings get stable ids.** The article page builds its contents rail from `headings`, and
 *     Google reads those same anchors for jump-to-section links in the result. That only works if
 *     the id in the rail and the id on the h2 come from one pass — hence they are returned
 *     together rather than derived twice.
 *
 * The supported subset is deliberately small and covers what an SEO article actually needs:
 * H2/H3/H4, paragraphs, bold/italic/strikethrough, inline code, fenced code, links, images,
 * bullet and numbered lists, blockquotes, and horizontal rules.
 */

export type ArticleHeading = { id: string; text: string; level: 2 | 3 | 4 };

export type ArticleStats = {
  wordCount: number;
  readingMinutes: number;
  /** H2s only — the structural spine Google reads as the outline of the page. */
  headingCount: number;
  /** H2 + H3 + H4. */
  subheadingCount: number;
  /** Links to Bluepass itself: relative, in-page, or an absolute bluepass.co URL. */
  internalLinks: number;
  /** Links off-site. Citing a real source is a quality signal; having none reads as a closed page. */
  outboundLinks: number;
  imageCount: number;
  /** Plain text of the opening paragraph — what the keyword-in-intro check looks at. */
  firstParagraph: string;
  plainText: string;
};

export type RenderedArticle = {
  html: string;
  headings: ArticleHeading[];
  stats: ArticleStats;
};

/** Average adult reading speed for non-fiction prose. Used only to print "N min read". */
const WORDS_PER_MINUTE = 220;

/**
 * The stand-in a code span is parked under while the emphasis and link passes run. A private-use
 * codepoint rather than something like `@@CODE0@@`, so no body text can collide with it.
 */
const CODE_SENTINEL = "\uE000";

const INLINE_LINK = /\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g;
const INLINE_IMAGE = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g;

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Whether a URL is safe to put in an href/src.
 *
 * Allow-list rather than deny-list: `javascript:`, `data:` and friends are not enumerated here,
 * they simply are not http(s), mailto, tel, relative or in-page, so they fail. Returns null for a
 * URL that should be dropped, and the caller renders the link text without a link.
 */
export function safeUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (/^(https?:\/\/|mailto:|tel:)/i.test(value)) return value;
  if (value.startsWith("/") || value.startsWith("#")) return value;
  return null;
}

/** A link that stays on Bluepass — relative, in-page, or an absolute URL on our own host. */
export function isInternalUrl(url: string): boolean {
  if (url.startsWith("/") || url.startsWith("#")) return true;
  return /^https?:\/\/([a-z0-9-]+\.)*bluepass\.co(\/|$|:)/i.test(url);
}

/**
 * Markdown source reduced to the words a reader would actually read.
 *
 * Both the word count and every keyword check run off this, so that "**Komodo** liveaboard" and
 * "Komodo liveaboard" count identically — otherwise an author would be punished for bolding the
 * phrase they were told to emphasise.
 */
export function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(INLINE_IMAGE, " ")
    .replace(INLINE_LINK, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+[.)]\s+/gm, "")
    .replace(/^\s*(-{3,}|\*{3,}|_{3,})\s*$/gm, " ")
    .replace(/(\*\*|__|~~)/g, "")
    .replace(/(^|\s)[*_]([^*_\n]+)[*_](?=\s|$)/g, "$1$2")
    .replace(/[ \t]+/g, " ")
    .trim();
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/**
 * Everything the SEO checklist needs, without building any HTML.
 *
 * Kept separate from `renderArticle` because the editor recomputes this on every keystroke in the
 * browser; the reader only ever needs it once, on the server, alongside the render.
 */
export function articleStats(markdown: string): ArticleStats {
  const withoutCode = markdown.replace(/```[\s\S]*?```/g, "\n");
  const plainText = stripMarkdown(markdown);
  const wordCount = countWords(plainText);

  const headingCount = (withoutCode.match(/^\s{0,3}##\s+\S/gm) ?? []).length;
  const subheadingCount = (withoutCode.match(/^\s{0,3}#{2,4}\s+\S/gm) ?? []).length;
  const imageCount = [...withoutCode.matchAll(INLINE_IMAGE)].length;

  let internalLinks = 0;
  let outboundLinks = 0;

  // Images are matched by the same bracket shape as links, so strip them before counting or every
  // inline image would be scored as an outbound citation.
  for (const match of withoutCode.replace(INLINE_IMAGE, " ").matchAll(INLINE_LINK)) {
    const url = safeUrl(match[2]);
    if (!url) continue;
    if (isInternalUrl(url)) internalLinks += 1;
    else outboundLinks += 1;
  }

  return {
    wordCount,
    readingMinutes: wordCount === 0 ? 0 : Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE)),
    headingCount,
    subheadingCount,
    internalLinks,
    outboundLinks,
    imageCount,
    firstParagraph: firstParagraphOf(markdown),
    plainText,
  };
}

/** The opening prose block — skipping any leading heading, image or quote the author started with. */
function firstParagraphOf(markdown: string): string {
  const blocks = markdown.replace(/```[\s\S]*?```/g, "\n\n").split(/\n\s*\n/);

  for (const block of blocks) {
    const line = block.trim();
    if (!line) continue;
    if (/^#{1,6}\s/.test(line)) continue;
    if (/^!\[/.test(line)) continue;
    if (/^>/.test(line)) continue;
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) continue;
    const text = stripMarkdown(line).replace(/\n/g, " ").trim();
    if (text) return text;
  }

  return "";
}

/** Markdown in, article HTML plus its outline out. */
export function renderArticle(markdown: string): RenderedArticle {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const html: string[] = [];
  const headings: ArticleHeading[] = [];
  const usedIds = new Set<string>();
  let i = 0;

  const isBlockStart = (line: string) =>
    /^\s{0,3}#{2,6}\s+/.test(line) ||
    /^\s{0,3}(```|~~~)/.test(line) ||
    /^\s{0,3}>/.test(line) ||
    /^\s*[-*+]\s+/.test(line) ||
    /^\s*\d+[.)]\s+/.test(line) ||
    /^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line);

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i += 1;
      continue;
    }

    // Fenced code. Everything inside is escaped and emitted verbatim — no inline pass, or a
    // snippet containing a double asterisk would render half of itself bold.
    const fence = /^\s{0,3}(```|~~~)(.*)$/.exec(line);
    if (fence) {
      const marker = fence[1];
      const language = fence[2].trim().replace(/[^a-zA-Z0-9+#-]/g, "");
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trimStart().startsWith(marker)) {
        body.push(lines[i]);
        i += 1;
      }
      i += 1; // consume the closing fence
      const classAttr = language ? ` class="language-${escapeHtml(language)}"` : "";
      html.push(
        `<pre class="bp-article__code"><code${classAttr}>${escapeHtml(body.join("\n"))}</code></pre>`,
      );
      continue;
    }

    const heading = /^\s{0,3}(#{2,6})\s+(.*)$/.exec(line);
    if (heading) {
      // H1 belongs to the page title, so the editor only offers H2-H4; anything deeper an author
      // pastes in is clamped to H4 rather than emitting an h5/h6 nothing styles.
      const level = Math.min(heading[1].length, 4) as 2 | 3 | 4;
      const text = heading[2].trim();
      const plain = stripMarkdown(text);
      const id = headingId(plain, usedIds);
      headings.push({ id, text: plain, level });
      html.push(`<h${level} id="${id}" class="bp-article__h${level}">${inline(text)}</h${level}>`);
      i += 1;
      continue;
    }

    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      html.push(`<hr class="bp-article__rule" />`);
      i += 1;
      continue;
    }

    if (/^\s{0,3}>/.test(line)) {
      const body: string[] = [];
      while (i < lines.length && /^\s{0,3}>/.test(lines[i])) {
        body.push(lines[i].replace(/^\s{0,3}>\s?/, ""));
        i += 1;
      }
      html.push(
        `<blockquote class="bp-article__quote"><p>${inline(body.join(" ").trim())}</p></blockquote>`,
      );
      continue;
    }

    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length) {
        const item = /^\s*[-*+]\s+(.*)$/.exec(lines[i]);
        if (!item) break;
        items.push(`<li>${inline(item[1].trim())}</li>`);
        i += 1;
      }
      html.push(`<ul class="bp-article__list">${items.join("")}</ul>`);
      continue;
    }

    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length) {
        const item = /^\s*\d+[.)]\s+(.*)$/.exec(lines[i]);
        if (!item) break;
        items.push(`<li>${inline(item[1].trim())}</li>`);
        i += 1;
      }
      html.push(`<ol class="bp-article__list bp-article__list--ordered">${items.join("")}</ol>`);
      continue;
    }

    // An image on a line of its own becomes a figure with the title text as its caption. Inline
    // images inside a sentence stay inline (handled by `inline`).
    const standaloneImage = /^\s*!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)\s*$/.exec(line);
    if (standaloneImage) {
      const url = safeUrl(standaloneImage[2]);
      if (url) {
        const alt = escapeHtml(standaloneImage[1]);
        const caption = standaloneImage[3] ?? "";
        html.push(
          `<figure class="bp-article__figure"><img src="${escapeHtml(url)}" alt="${alt}" loading="lazy" />` +
            (caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : "") +
            `</figure>`,
        );
      }
      i += 1;
      continue;
    }

    // Paragraph: keep consuming until a blank line or the start of another block, so a soft-wrapped
    // sentence in the editor stays one paragraph.
    const paragraph: string[] = [];
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) {
      paragraph.push(lines[i].trim());
      i += 1;
    }
    if (paragraph.length) {
      html.push(`<p>${inline(paragraph.join(" "))}</p>`);
    }
  }

  return { html: html.join("\n"), headings, stats: articleStats(markdown) };
}

/** Emphasis, code, links and images inside one block of text. */
function inline(text: string): string {
  // Code spans come out first and go back in last: whatever is inside them must survive the
  // emphasis and link passes untouched.
  const codeSpans: string[] = [];
  let out = text.replace(/`([^`]+)`/g, (_match, code: string) => {
    codeSpans.push(code);
    return `${CODE_SENTINEL}${codeSpans.length - 1}${CODE_SENTINEL}`;
  });

  out = escapeHtml(out);

  out = out.replace(INLINE_IMAGE, (_match, alt: string, href: string) => {
    const url = safeUrl(href);
    if (!url) return "";
    return `<img src="${url}" alt="${alt}" loading="lazy" class="bp-article__inline-image" />`;
  });

  out = out.replace(INLINE_LINK, (_match, label: string, href: string, title?: string) => {
    const url = safeUrl(href);
    // A link we will not render still keeps its words — dropping the sentence would be worse.
    if (!url) return label;
    const titleAttr = title ? ` title="${title}"` : "";
    // Outbound links open in a new tab and carry rel="noopener"; `nofollow` is deliberately NOT
    // set — citing a real source is part of why the page deserves to rank.
    const relAttr = isInternalUrl(url) ? "" : ` target="_blank" rel="noopener noreferrer"`;
    return `<a href="${url}"${titleAttr}${relAttr}>${label}</a>`;
  });

  out = out
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/~~([^~]+)~~/g, "<del>$1</del>")
    .replace(/\*([^*\n]+)\*/g, "<em>$1</em>")
    .replace(/(^|[\s(])_([^_\n]+)_(?=[\s.,!?)]|$)/g, "$1<em>$2</em>");

  const sentinel = new RegExp(`${CODE_SENTINEL}(\\d+)${CODE_SENTINEL}`, "g");
  return out.replace(sentinel, (_match, index: string) => {
    return `<code>${escapeHtml(codeSpans[Number(index)])}</code>`;
  });
}

/**
 * The article split into `## heading` + the prose under it, as plain text.
 *
 * Only used to build FAQ and How-to structured data. Google requires the answer text to be the
 * text actually visible on the page, so this reads the same source the renderer does rather than
 * letting an author write one answer for readers and another for the crawler.
 */
export function articleSections(markdown: string): { heading: string; body: string }[] {
  const sections: { heading: string; body: string[] }[] = [];

  for (const line of markdown.replace(/```[\s\S]*?```/g, "\n").split("\n")) {
    const heading = /^\s{0,3}#{2,4}\s+(.*)$/.exec(line);
    if (heading) {
      sections.push({ heading: stripMarkdown(heading[1]).trim(), body: [] });
      continue;
    }
    if (sections.length > 0 && line.trim()) {
      sections[sections.length - 1].body.push(stripMarkdown(line).trim());
    }
  }

  return sections
    .map((section) => ({ heading: section.heading, body: section.body.join(" ").replace(/\s+/g, " ").trim() }))
    .filter((section) => section.heading && section.body);
}
