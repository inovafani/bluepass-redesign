import type { BlogPost } from "@prisma/client";
import { articleSections } from "./markdown";
import { absoluteUrl, siteUrl } from "./site";

/**
 * Structured data for an article page.
 *
 * This is the part that turns a blue link into a result with a date, a byline, a breadcrumb trail
 * and — for an FAQ or a how-to — an expandable block that takes up several times the vertical
 * space of a normal listing. On a query where Bluepass is competing with aggregators, that space
 * is most of the advantage.
 *
 * One rule runs through all of it: **never claim anything the page does not show.** Google treats
 * FAQ markup whose answers are not visible on the page as spam, and the penalty is worse than the
 * rich result was worth. So the FAQ and How-to bodies are read out of the same Markdown the reader
 * sees, and Organization/author are the real entity from the footer, not an invented publisher.
 */

const ORGANISATION_ID = `${siteUrl()}/#organization`;

type JsonLdNode = Record<string, unknown>;

export function buildArticleJsonLd(
  post: Pick<
    BlogPost,
    | "title"
    | "slug"
    | "seoTitle"
    | "metaDescription"
    | "excerpt"
    | "bodyMarkdown"
    | "heroImageUrl"
    | "authorName"
    | "publishedAt"
    | "updatedAt"
    | "structuredData"
    | "wordCount"
  > & { category: { name: string; slug: string } | null },
  description: string,
): JsonLdNode[] {
  const url = absoluteUrl(`/blog/${post.slug}`);
  const image = post.heroImageUrl ? [absolute(post.heroImageUrl)] : undefined;

  const organisation: JsonLdNode = {
    "@type": "Organization",
    "@id": ORGANISATION_ID,
    name: "Bluepass",
    url: siteUrl(),
    logo: absoluteUrl("/bluepass-logo-full.png"),
    description: "Vetted operators for surf, sail and dive, booked at the price you see.",
  };

  const article: JsonLdNode = {
    "@type": "BlogPosting",
    "@id": `${url}#article`,
    headline: (post.seoTitle || post.title).slice(0, 110),
    description,
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    ...(image ? { image } : {}),
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    wordCount: post.wordCount,
    // Person rather than Organization: the byline is a name on the page, and claiming a corporate
    // author for a signed article is the kind of small inconsistency the guidelines care about.
    author: { "@type": "Person", name: post.authorName },
    publisher: { "@id": ORGANISATION_ID },
    ...(post.category ? { articleSection: post.category.name } : {}),
    inLanguage: "en",
  };

  const breadcrumbs: JsonLdNode = {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Bluepass", item: siteUrl() },
      { "@type": "ListItem", position: 2, name: "Journal", item: absoluteUrl("/blog") },
      ...(post.category
        ? [
            {
              "@type": "ListItem",
              position: 3,
              name: post.category.name,
              item: absoluteUrl(`/blog/category/${post.category.slug}`),
            },
          ]
        : []),
      {
        "@type": "ListItem",
        position: post.category ? 4 : 3,
        name: post.title,
        item: url,
      },
    ],
  };

  const nodes: JsonLdNode[] = [organisation, article, breadcrumbs];

  /* The two enhanced types are built from the article's own H2/H3 sections. If the author picked
     FAQ but wrote no sections, nothing is emitted rather than an empty mainEntity — invalid markup
     is worse than none. */
  const sections = articleSections(post.bodyMarkdown);

  if (post.structuredData === "FAQ_PAGE" && sections.length > 0) {
    nodes.push({
      "@type": "FAQPage",
      "@id": `${url}#faq`,
      mainEntity: sections.map((section) => ({
        "@type": "Question",
        name: section.heading,
        acceptedAnswer: { "@type": "Answer", text: section.body },
      })),
    });
  }

  if (post.structuredData === "HOW_TO" && sections.length > 0) {
    nodes.push({
      "@type": "HowTo",
      "@id": `${url}#howto`,
      name: post.title,
      description,
      ...(image ? { image } : {}),
      step: sections.map((section, index) => ({
        "@type": "HowToStep",
        position: index + 1,
        name: section.heading,
        text: section.body,
        url: `${url}#${slugForAnchor(section.heading)}`,
      })),
    });
  }

  return nodes;
}

/** The /blog index, as a collection Google can attach the site's name to. */
export function buildBlogIndexJsonLd(posts: { title: string; slug: string }[]): JsonLdNode {
  return {
    "@type": "CollectionPage",
    "@id": `${absoluteUrl("/blog")}#collection`,
    name: "The Bluepass Journal",
    url: absoluteUrl("/blog"),
    isPartOf: { "@id": ORGANISATION_ID },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: posts.map((post, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: post.title,
        url: absoluteUrl(`/blog/${post.slug}`),
      })),
    },
  };
}

/** Wraps nodes in the single `@graph` document a page should emit. */
export function jsonLdDocument(nodes: JsonLdNode[]) {
  return { "@context": "https://schema.org", "@graph": nodes };
}

function absolute(url: string) {
  return url.startsWith("http") ? url : absoluteUrl(url);
}

/* Mirrors `headingId` closely enough for an anchor; the renderer owns the real ids, and a How-to
   step URL that misses by a dedupe suffix still lands on the right page. */
function slugForAnchor(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
