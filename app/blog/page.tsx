import type { Metadata } from "next";
import Link from "next/link";
import BlogCard from "@/components/blog/BlogCard";
import BlogChips from "@/components/blog/BlogChips";
import BlogHero from "@/components/blog/BlogHero";
import SiteFooter from "@/components/SiteFooter";
import { listPublicCategories, listPublishedPosts } from "@/lib/services/blog/posts";
import { siteUrl } from "@/lib/services/blog/site";

export const metadata: Metadata = {
  title: "The Bluepass Journal | Guides to surf, sail and dive trips",
  description:
    "Honest guides to booking the ocean: how to read an operator, what a trip should cost, and where the 5% conservation share actually goes. Written by the people who vet the boats.",
  alternates: { canonical: `${siteUrl()}/blog` },
  openGraph: {
    type: "website",
    title: "The Bluepass Journal",
    description: "Honest guides to booking surf, sail and dive trips — written by the people who vet the boats.",
    url: `${siteUrl()}/blog`,
  },
};

/**
 * /blog — the index.
 *
 * Revalidated rather than dynamic. An editorial index changes a few times a week and is hit by
 * crawlers far more often than it is edited; a cached page that publishing busts explicitly
 * (see revalidateBlog in app/admin/blog/actions.ts) is both faster for readers and steadier under
 * a crawl than rebuilding it per request.
 */
export const revalidate = 300;

export default async function BlogIndexPage() {
  const [posts, categories] = await Promise.all([listPublishedPosts({ take: 40 }), listPublicCategories()]);

  const [lead, ...rest] = posts;

  return (
    /* No `page--nav-offset`: the hero photo runs up behind the fixed nav the way every other
       full-bleed hero on the site does, so the bar sits over the image rather than on a black
       band above it. */
    <main className="bp-blog">
      <BlogHero
        image="/hervey-bay-2.jpg"
        lines={["What we have learned", "putting people on the right boat"]}
        support="Guides to surf, sail and dive trips from the team that vets the operators — what a trip should cost, how to read a crew, and what happens to the 5% every booking sends back to the ocean."
      >
        <BlogChips categories={categories} />
      </BlogHero>

      {posts.length === 0 ? (
        <section className="section shell bp-blog__empty">
          <p className="ds-body-lg bp-blog__empty-copy">
            The first article is being written. In the meantime, the{" "}
            <Link href="/conservation">conservation record</Link> is the most-read thing we publish.
          </p>
        </section>
      ) : (
        <section className="section shell bp-blog__body">
          <BlogCard post={lead} featured />

          {rest.length > 0 ? (
            <div className="bp-grid">
              {rest.map((post) => (
                <BlogCard key={post.id} post={post} />
              ))}
            </div>
          ) : null}
        </section>
      )}

      <section className="section shell bp-blog__cta">
        <h2 className="ds-display-md bp-blog__cta-title">Reading about it is the easy part.</h2>
        <p className="ds-body-lg bp-blog__cta-copy">
          Every operator on Bluepass is vetted, priced the same as booking direct, and sends 5% of
          the fare back to the ocean.
        </p>
        <Link href="/" className="bp-blog__cta-btn">
          See the trips
        </Link>
      </section>

      <SiteFooter />
    </main>
  );
}
