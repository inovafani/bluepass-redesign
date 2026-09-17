import type { MetadataRoute } from "next";
import { listPublicCategories, listSitemapPosts } from "@/lib/services/blog/posts";
import { absoluteUrl } from "@/lib/services/blog/site";

/**
 * The sitemap.
 *
 * Added with the blog because a blog is the first part of this site that produces URLs faster than
 * a crawler finds them on its own. The static marketing routes are listed alongside the articles —
 * one sitemap is easier to keep honest than two, and Search Console reads it as the definitive
 * list of what Bluepass thinks is worth indexing.
 *
 * Deliberately absent: /admin, /crm, /operator, /partner-portal, /account, /login, /register and
 * the auth flows. They are all private, most are noindex already, and listing them only tells a
 * scraper where the doors are.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, categories] = await Promise.all([listSitemapPosts(), listPublicCategories()]);

  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/explore"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/conservation"), lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: absoluteUrl("/partners"), lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: absoluteUrl("/blog"), lastModified: posts[0]?.publishedAt ?? now, changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/privacy"), lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: absoluteUrl("/terms"), lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];

  return [
    ...staticRoutes,
    ...categories.map((category) => ({
      url: absoluteUrl(`/blog/category/${category.slug}`),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    /* `lastModified` is the edit date, not the publish date: it is what tells a crawler an already
       indexed article is worth re-reading after a rewrite. */
    ...posts.map((post) => ({
      url: absoluteUrl(`/blog/${post.slug}`),
      lastModified: post.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
