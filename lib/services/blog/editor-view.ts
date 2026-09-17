import type { BlogPost } from "@prisma/client";
import type { BlogEditorPost } from "@/components/admin/blog/BlogEditor";

/**
 * The database row, flattened into the shape the editor form holds.
 *
 * Every nullable column becomes an empty string. A controlled React input given `null` switches
 * itself to uncontrolled and then warns on the first keystroke, so the conversion has to happen
 * once, here, rather than being remembered at twenty call sites.
 */
export function toEditorPost(post: BlogPost): BlogEditorPost {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    authorName: post.authorName,
    bodyMarkdown: post.bodyMarkdown,
    excerpt: post.excerpt ?? "",
    tags: post.tags,
    categoryId: post.categoryId ?? "",
    heroImageUrl: post.heroImageUrl ?? "",
    heroImageAlt: post.heroImageAlt ?? "",
    focusKeyword: post.focusKeyword ?? "",
    seoTitle: post.seoTitle ?? "",
    metaDescription: post.metaDescription ?? "",
    canonicalUrl: post.canonicalUrl ?? "",
    structuredData: post.structuredData,
    noindex: post.noindex,
    shareTitle: post.shareTitle ?? "",
    shareDescription: post.shareDescription ?? "",
    shareImageUrl: post.shareImageUrl ?? "",
    status: post.status,
    // UTC, matching what the field is labelled and how the editor parses it back.
    publishedAt: post.publishedAt ? post.publishedAt.toISOString().slice(0, 16) : "",
  };
}

export const EMPTY_EDITOR_POST: BlogEditorPost = {
  id: null,
  title: "",
  slug: "",
  authorName: "Bluepass",
  bodyMarkdown: "",
  excerpt: "",
  tags: [],
  categoryId: "",
  heroImageUrl: "",
  heroImageAlt: "",
  focusKeyword: "",
  seoTitle: "",
  metaDescription: "",
  canonicalUrl: "",
  structuredData: "ARTICLE",
  noindex: false,
  shareTitle: "",
  shareDescription: "",
  shareImageUrl: "",
  status: "DRAFT",
  publishedAt: "",
};
