import { BlogPostStatus, BlogStructuredData, Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { articleStats } from "./markdown";
import { slugify, uniqueSlug } from "./slug";

/**
 * Everything the blog reads and writes, in one service.
 *
 * The split that matters here is admin vs public, and it is enforced by the query rather than by
 * the caller remembering: `listPublishedPosts` and `loadPublishedPost` filter on
 * `status = PUBLISHED` and a `publishedAt` that has actually arrived, so a scheduled post cannot
 * leak early even if a page forgets to ask. The admin readers deliberately return drafts — that is
 * the whole point of the console.
 */

const TAG_LIMIT = 12;

/* A trimmed string that becomes `undefined` when empty, so an emptied input clears the column
   rather than writing "". */
function optionalText(max: number) {
  return z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : undefined));
}

export const blogPostSchema = z.object({
  title: z.string().trim().min(3, "Give the article a title.").max(200),
  /* Blank is allowed and means "derive it from the title" — an author should not have to think
     about the URL for an ordinary post, only for one where it matters. */
  slug: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => (value ? slugify(value) : "")),
  authorName: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => (value ? value : "Bluepass")),
  bodyMarkdown: z.string().max(200_000).optional().transform((value) => value ?? ""),
  excerpt: optionalText(400),
  tags: z
    .array(z.string().trim().min(1).max(40))
    .max(TAG_LIMIT)
    .optional()
    .transform((value) => {
      const seen = new Set<string>();
      return (value ?? []).filter((tag) => {
        const key = tag.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }),
  categoryId: optionalText(40),
  heroImageUrl: optionalText(1000),
  heroImageAlt: optionalText(300),
  focusKeyword: optionalText(120),
  seoTitle: optionalText(200),
  metaDescription: optionalText(400),
  canonicalUrl: optionalText(1000),
  structuredData: z.nativeEnum(BlogStructuredData).optional().transform((value) => value ?? BlogStructuredData.ARTICLE),
  noindex: z.boolean().optional().transform((value) => value ?? false),
  shareTitle: optionalText(200),
  shareDescription: optionalText(400),
  shareImageUrl: optionalText(1000),
  status: z.nativeEnum(BlogPostStatus).optional().transform((value) => value ?? BlogPostStatus.DRAFT),
  /* A date in the future is a schedule, not a mistake: the public queries filter on it, so the
     post appears on its own. Blank means "stamp it when it first goes live". */
  publishedAt: z
    .union([z.date(), z.string()])
    .optional()
    .transform((value) => {
      if (!value) return undefined;
      const date = value instanceof Date ? value : new Date(value);
      return Number.isNaN(date.getTime()) ? undefined : date;
    }),
});

export type BlogPostInput = z.input<typeof blogPostSchema>;

export type AdminBlogPostRow = {
  id: string;
  title: string;
  slug: string;
  status: BlogPostStatus;
  publishedAt: Date | null;
  updatedAt: Date;
  readingMinutes: number;
  wordCount: number;
  focusKeyword: string | null;
  heroImageUrl: string | null;
  metaDescription: string | null;
  excerpt: string | null;
  noindex: boolean;
  category: { id: string; name: string; slug: string } | null;
};

export type BlogCategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  position: number;
  postCount: number;
  publishedCount: number;
};

/* Public-facing card: everything /blog needs to render a tile, and nothing it does not — the body
   of fifteen articles is not something a listing page should be loading. */
const publicCardSelect = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  bodyMarkdown: false,
  heroImageUrl: true,
  heroImageAlt: true,
  authorName: true,
  publishedAt: true,
  readingMinutes: true,
  tags: true,
  category: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.BlogPostSelect;

export type PublicBlogCard = Prisma.BlogPostGetPayload<{ select: typeof publicCardSelect }>;

/** The filter that defines "live": published, and its publish moment has passed. */
function livePostWhere(): Prisma.BlogPostWhereInput {
  return { status: BlogPostStatus.PUBLISHED, publishedAt: { not: null, lte: new Date() } };
}

/* Admin reads ------------------------------------------------------------------------------- */

export async function listAdminBlogPosts(): Promise<AdminBlogPostRow[]> {
  return prisma.blogPost.findMany({
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      publishedAt: true,
      updatedAt: true,
      readingMinutes: true,
      wordCount: true,
      focusKeyword: true,
      heroImageUrl: true,
      metaDescription: true,
      excerpt: true,
      noindex: true,
      category: { select: { id: true, name: true, slug: true } },
    },
  });
}

export async function loadAdminBlogPost(id: string) {
  return prisma.blogPost.findUnique({ where: { id } });
}

export async function listBlogCategories(): Promise<BlogCategoryRow[]> {
  const categories = await prisma.blogCategory.findMany({
    orderBy: [{ position: "asc" }, { name: "asc" }],
    include: {
      posts: { select: { id: true, status: true, publishedAt: true } },
    },
  });

  const now = new Date();

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    position: category.position,
    postCount: category.posts.length,
    publishedCount: category.posts.filter(
      (post) => post.status === BlogPostStatus.PUBLISHED && post.publishedAt && post.publishedAt <= now,
    ).length,
  }));
}

/* Admin writes ------------------------------------------------------------------------------ */

export type SaveBlogPostResult = { id: string; slug: string; status: BlogPostStatus };

/**
 * Create or update one article.
 *
 * Three things happen here that the form cannot be trusted to do:
 *
 *  - the slug is resolved against every *other* post, so re-saving never walks a live URL to `-2`;
 *  - word count and reading time are recomputed from the body rather than accepted from the client;
 *  - `publishedAt` is stamped on the first transition to PUBLISHED and then left alone, so editing
 *    a two-month-old article does not silently re-date it to today.
 */
export async function saveBlogPost(id: string | null, raw: BlogPostInput): Promise<SaveBlogPostResult> {
  const input = blogPostSchema.parse(raw);
  const stats = articleStats(input.bodyMarkdown);

  const existing = id ? await prisma.blogPost.findUnique({ where: { id } }) : null;
  if (id && !existing) {
    throw new Error("That article no longer exists.");
  }

  const taken = await prisma.blogPost.findMany({
    where: id ? { id: { not: id } } : undefined,
    select: { slug: true },
  });
  const desired = input.slug || slugify(input.title);
  const slug =
    existing && desired === existing.slug ? existing.slug : uniqueSlug(desired, taken.map((row) => row.slug));

  const publishing = input.status === BlogPostStatus.PUBLISHED;
  const publishedAt = input.publishedAt ?? existing?.publishedAt ?? (publishing ? new Date() : null);

  // A category that has since been deleted must not fail the whole save — the post simply becomes
  // unfiled, which is a state the rest of the code already handles.
  const categoryId = input.categoryId
    ? (await prisma.blogCategory.findUnique({ where: { id: input.categoryId }, select: { id: true } }))?.id ?? null
    : null;

  const data = {
    title: input.title,
    slug,
    authorName: input.authorName,
    bodyMarkdown: input.bodyMarkdown,
    excerpt: input.excerpt ?? null,
    tags: input.tags,
    categoryId,
    heroImageUrl: input.heroImageUrl ?? null,
    heroImageAlt: input.heroImageAlt ?? null,
    focusKeyword: input.focusKeyword ?? null,
    seoTitle: input.seoTitle ?? null,
    metaDescription: input.metaDescription ?? null,
    canonicalUrl: input.canonicalUrl ?? null,
    structuredData: input.structuredData,
    noindex: input.noindex,
    shareTitle: input.shareTitle ?? null,
    shareDescription: input.shareDescription ?? null,
    shareImageUrl: input.shareImageUrl ?? null,
    status: input.status,
    publishedAt,
    wordCount: stats.wordCount,
    readingMinutes: stats.readingMinutes,
  };

  const saved = existing
    ? await prisma.blogPost.update({ where: { id: existing.id }, data })
    : await prisma.blogPost.create({ data });

  return { id: saved.id, slug: saved.slug, status: saved.status };
}

export async function deleteBlogPost(id: string) {
  await prisma.blogPost.delete({ where: { id } });
}

export async function saveBlogCategory(id: string | null, name: string, description: string, position: number) {
  const trimmed = name.trim();
  if (trimmed.length < 2) throw new Error("Give the category a name.");

  const taken = await prisma.blogCategory.findMany({
    where: id ? { id: { not: id } } : undefined,
    select: { slug: true },
  });
  const existing = id ? await prisma.blogCategory.findUnique({ where: { id } }) : null;
  const desired = slugify(trimmed);
  const slug = existing && desired === existing.slug ? existing.slug : uniqueSlug(desired, taken.map((row) => row.slug));

  const data = { name: trimmed, slug, description: description.trim() || null, position };

  if (existing) {
    await prisma.blogCategory.update({ where: { id: existing.id }, data });
    return existing.id;
  }

  const created = await prisma.blogCategory.create({ data });
  return created.id;
}

/** Posts are not deleted with the category — the relation is SetNull, so they become unfiled. */
export async function deleteBlogCategory(id: string) {
  await prisma.blogCategory.delete({ where: { id } });
}

/* Public reads ------------------------------------------------------------------------------ */

export async function listPublishedPosts(options: { categorySlug?: string; take?: number; skip?: number } = {}) {
  return prisma.blogPost.findMany({
    where: {
      ...livePostWhere(),
      ...(options.categorySlug ? { category: { slug: options.categorySlug } } : {}),
    },
    orderBy: { publishedAt: "desc" },
    take: options.take,
    skip: options.skip,
    select: publicCardSelect,
  });
}

export async function countPublishedPosts(categorySlug?: string) {
  return prisma.blogPost.count({
    where: { ...livePostWhere(), ...(categorySlug ? { category: { slug: categorySlug } } : {}) },
  });
}

export async function loadPublishedPost(slug: string) {
  return prisma.blogPost.findFirst({
    where: { slug, ...livePostWhere() },
    include: { category: { select: { id: true, name: true, slug: true } } },
  });
}

/**
 * What to read next.
 *
 * Ordered by how related it actually is: same category first, then anything sharing a tag, then
 * the most recent articles as filler. Ranking in one SQL query would need a scoring expression
 * Prisma cannot express, and the three small queries here are all indexed — at blog scale this is
 * cheaper than being clever.
 */
export async function listRelatedPosts(post: { id: string; categoryId: string | null; tags: string[] }, take = 3) {
  const collected: PublicBlogCard[] = [];
  const seen = new Set<string>([post.id]);

  const push = (rows: PublicBlogCard[]) => {
    for (const row of rows) {
      if (seen.has(row.id) || collected.length >= take) continue;
      seen.add(row.id);
      collected.push(row);
    }
  };

  if (post.categoryId) {
    push(
      await prisma.blogPost.findMany({
        where: { ...livePostWhere(), categoryId: post.categoryId, id: { not: post.id } },
        orderBy: { publishedAt: "desc" },
        take,
        select: publicCardSelect,
      }),
    );
  }

  if (collected.length < take && post.tags.length > 0) {
    push(
      await prisma.blogPost.findMany({
        where: { ...livePostWhere(), tags: { hasSome: post.tags }, id: { notIn: [...seen] } },
        orderBy: { publishedAt: "desc" },
        take,
        select: publicCardSelect,
      }),
    );
  }

  if (collected.length < take) {
    push(
      await prisma.blogPost.findMany({
        where: { ...livePostWhere(), id: { notIn: [...seen] } },
        orderBy: { publishedAt: "desc" },
        take,
        select: publicCardSelect,
      }),
    );
  }

  return collected;
}

export async function listPublicCategories() {
  const categories = await prisma.blogCategory.findMany({
    orderBy: [{ position: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      _count: { select: { posts: { where: livePostWhere() } } },
    },
  });

  // A category with nothing live in it is an empty page for a crawler to find. Hide it until it
  // has something to show.
  return categories.filter((category) => category._count.posts > 0);
}

export async function loadPublicCategory(slug: string) {
  return prisma.blogCategory.findUnique({ where: { slug } });
}

/** Sitemap feed. `noindex` posts are excluded — listing a noindex URL only wastes crawl budget. */
export async function listSitemapPosts() {
  return prisma.blogPost.findMany({
    where: { ...livePostWhere(), noindex: false },
    orderBy: { publishedAt: "desc" },
    select: { slug: true, updatedAt: true, publishedAt: true },
  });
}
