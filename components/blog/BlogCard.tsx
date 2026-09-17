import Link from "next/link";
import type { PublicBlogCard } from "@/lib/services/blog/posts";

/**
 * One article, as a tile.
 *
 * The whole card is a single link rather than a card containing a link — a reader aiming at a
 * thumbnail expects the thumbnail to be clickable, and nesting a second anchor inside for the
 * category would be invalid markup. The category therefore reads as a label here; the archive is
 * reachable from the chips at the top of /blog.
 */
export default function BlogCard({ post, featured = false }: { post: PublicBlogCard; featured?: boolean }) {
  return (
    <Link href={`/blog/${post.slug}`} className={`bp-card${featured ? " bp-card--featured" : ""}`}>
      <span className="bp-card__media">
        {post.heroImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.heroImageUrl} alt={post.heroImageAlt ?? ""} loading={featured ? "eager" : "lazy"} />
        ) : (
          <span className="bp-card__media-empty" aria-hidden />
        )}
      </span>

      <span className="bp-card__body">
        <span className="bp-card__meta">
          {post.category ? <span className="ds-micro bp-card__cat">{post.category.name}</span> : null}
          <span className="ds-micro bp-card__dot" aria-hidden />
          <span className="ds-micro bp-card__time">{post.readingMinutes} min read</span>
        </span>

        <span className={`${featured ? "ds-display-md" : "ds-headline"} bp-card__title`}>{post.title}</span>

        {post.excerpt ? <span className="ds-body-sm bp-card__excerpt">{post.excerpt}</span> : null}

        <span className="ds-micro bp-card__foot">
          {post.authorName}
          {post.publishedAt ? ` · ${formatDate(post.publishedAt)}` : ""}
        </span>
      </span>
    </Link>
  );
}

export function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}
