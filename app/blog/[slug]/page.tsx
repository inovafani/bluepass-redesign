import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ArticleAside from "@/components/blog/ArticleAside";
import BlogCard, { formatDate } from "@/components/blog/BlogCard";
import SiteFooter from "@/components/SiteFooter";
import { buildArticleJsonLd, jsonLdDocument } from "@/lib/services/blog/jsonld";
import { renderArticle } from "@/lib/services/blog/markdown";
import { listRelatedPosts, loadPublishedPost } from "@/lib/services/blog/posts";
import { effectiveMetaDescription, effectiveSeoTitle } from "@/lib/services/blog/seo";
import { absoluteUrl } from "@/lib/services/blog/site";

export const revalidate = 300;

/**
 * Resolves the post twice per request — once in `generateMetadata`, once in the page. Next dedupes
 * identical fetches within a render pass but not Prisma calls, so this is genuinely two queries;
 * at one indexed lookup by unique slug, that is the cheaper trade against threading a cache
 * through a file whose whole job is to be correct about what search engines are told.
 */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await loadPublishedPost(slug);

  if (!post) {
    return { title: "Article not found | Bluepass", robots: { index: false, follow: false } };
  }

  const title = effectiveSeoTitle({ seoTitle: post.seoTitle ?? "", title: post.title });
  const description = effectiveMetaDescription({
    metaDescription: post.metaDescription ?? "",
    excerpt: post.excerpt ?? "",
    body: post.bodyMarkdown,
  });
  const url = absoluteUrl(`/blog/${post.slug}`);
  const image = post.shareImageUrl || post.heroImageUrl || undefined;

  return {
    title: `${title} | Bluepass`,
    description,
    // A self-referencing canonical unless the article was genuinely published elsewhere first.
    alternates: { canonical: post.canonicalUrl || url },
    robots: post.noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      type: "article",
      title: post.shareTitle || title,
      description: post.shareDescription || description,
      url,
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      authors: [post.authorName],
      ...(image ? { images: [{ url: image }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: post.shareTitle || title,
      description: post.shareDescription || description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function BlogArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await loadPublishedPost(slug);

  // A draft, a scheduled post before its date, or a deleted one all land here. 404 is the right
  // answer for every one of them — a soft "coming soon" page would get indexed.
  if (!post) notFound();

  const [article, related] = await Promise.all([
    Promise.resolve(renderArticle(post.bodyMarkdown)),
    listRelatedPosts({ id: post.id, categoryId: post.categoryId, tags: post.tags }, 3),
  ]);

  const description = effectiveMetaDescription({
    metaDescription: post.metaDescription ?? "",
    excerpt: post.excerpt ?? "",
    body: post.bodyMarkdown,
  });
  const url = absoluteUrl(`/blog/${post.slug}`);
  const jsonLd = jsonLdDocument(buildArticleJsonLd(post, description));

  return (
    <main className="bp-post page--nav-offset">
      <script
        type="application/ld+json"
        // JSON.stringify output, not author input — and `<` is the only character that could break
        // out of a script element, so it is escaped rather than trusted.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <header className="section shell bp-post__head">
        <nav className="bp-crumbs" aria-label="Breadcrumb">
          <Link href="/blog" className="ds-micro bp-crumbs__link">
            Journal
          </Link>
          {post.category ? (
            <>
              <span className="ds-micro bp-crumbs__sep" aria-hidden>
                /
              </span>
              <Link href={`/blog/category/${post.category.slug}`} className="ds-micro bp-crumbs__link">
                {post.category.name}
              </Link>
            </>
          ) : null}
        </nav>

        <h1 className="ds-display-lg bp-post__title">{post.title}</h1>

        {post.excerpt ? <p className="ds-body-lg bp-post__standfirst">{post.excerpt}</p> : null}

        <div className="bp-post__byline">
          <span className="ds-caption bp-post__author">{post.authorName}</span>
          <span className="bp-post__dot" aria-hidden />
          {post.publishedAt ? (
            <time className="ds-micro" dateTime={post.publishedAt.toISOString()}>
              {formatDate(post.publishedAt)}
            </time>
          ) : null}
          <span className="bp-post__dot" aria-hidden />
          <span className="ds-micro">{post.readingMinutes} min read</span>
        </div>
      </header>

      {post.heroImageUrl ? (
        <div className="shell bp-post__hero">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.heroImageUrl} alt={post.heroImageAlt ?? ""} />
        </div>
      ) : null}

      <div className="section shell bp-post__layout">
        <ArticleAside headings={article.headings} shareUrl={url} title={post.title} />

        <div className="bp-post__column">
          <div
            className="bp-article"
            // Rendered by lib/services/blog/markdown.ts, which escapes all input and emits only
            // its own tags. No author-supplied HTML reaches this string.
            dangerouslySetInnerHTML={{ __html: article.html }}
          />

          {post.tags.length > 0 ? (
            <div className="bp-post__tags">
              {post.tags.map((tag) => (
                <span key={tag} className="ds-micro bp-post__tag">
                  {tag}
                </span>
              ))}
            </div>
          ) : null}

          <aside className="bp-post__cta">
            <span className="ds-micro bp-post__cta-eyebrow">While you are here</span>
            <h2 className="ds-headline bp-post__cta-title">
              Every operator we write about is one you can actually book.
            </h2>
            <p className="ds-body-sm bp-post__cta-copy">
              Same price as booking direct, vetted crews, and a fixed 5% of the fare back to the
              ocean.
            </p>
            <div className="bp-post__cta-row">
              <Link href="/" className="bp-post__cta-btn">
                See the trips
              </Link>
              <Link href="/conservation" className="ds-micro bp-post__cta-link">
                Where the 5% goes →
              </Link>
            </div>
          </aside>
        </div>
      </div>

      {related.length > 0 ? (
        <section className="section shell bp-post__related">
          <h2 className="ds-display-md bp-post__related-title">Keep reading</h2>
          <div className="bp-grid">
            {related.map((entry) => (
              <BlogCard key={entry.id} post={entry} />
            ))}
          </div>
        </section>
      ) : null}

      <SiteFooter />
    </main>
  );
}
