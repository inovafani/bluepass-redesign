import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BlogCard from "@/components/blog/BlogCard";
import BlogChips from "@/components/blog/BlogChips";
import BlogHero from "@/components/blog/BlogHero";
import SiteFooter from "@/components/SiteFooter";
import { listPublicCategories, listPublishedPosts, loadPublicCategory } from "@/lib/services/blog/posts";
import { absoluteUrl } from "@/lib/services/blog/site";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const category = await loadPublicCategory(slug);

  if (!category) {
    return { title: "Category not found | Bluepass", robots: { index: false, follow: false } };
  }

  const description =
    category.description ??
    `Every Bluepass article filed under ${category.name} — guides to booking surf, sail and dive trips from the team that vets the operators.`;

  return {
    title: `${category.name} | The Bluepass Journal`,
    description,
    alternates: { canonical: absoluteUrl(`/blog/category/${category.slug}`) },
    openGraph: {
      type: "website",
      title: `${category.name} | The Bluepass Journal`,
      description,
      url: absoluteUrl(`/blog/category/${category.slug}`),
    },
  };
}

/**
 * A category archive.
 *
 * An archive with nothing live in it 404s rather than rendering an empty page: a thin, contentless
 * URL in the index is worse than no URL at all, and `listPublicCategories` already hides empty
 * categories from the chips, so the only way to arrive here is a stale link or a crawler.
 */
export default async function BlogCategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = await loadPublicCategory(slug);

  if (!category) notFound();

  const [posts, categories] = await Promise.all([
    listPublishedPosts({ categorySlug: slug, take: 60 }),
    listPublicCategories(),
  ]);

  if (posts.length === 0) notFound();

  return (
    <main className="bp-blog">
      {/* The eyebrow stays here, unlike on /blog. The headline is only the category name, so
          without it there is nothing on the page saying which publication you are inside. */}
      <BlogHero
        image="/hervey-bay-2.jpg"
        eyebrow="The Bluepass Journal"
        lines={[category.name]}
        support={
          category.description ??
          `Everything we have written about ${category.name.toLowerCase()}.`
        }
      >
        <BlogChips categories={categories} active={category.slug} />
      </BlogHero>

      <section className="section shell bp-blog__body">
        <div className="bp-grid">
          {posts.map((post) => (
            <BlogCard key={post.id} post={post} />
          ))}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
