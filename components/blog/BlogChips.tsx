import Link from "next/link";

/**
 * The category rail across the top of /blog.
 *
 * Real links to real archive pages rather than a client-side filter: a filter that only exists in
 * the browser is invisible to a crawler, and these archives are the second route into every
 * article. Being able to link someone straight at "everything we have written about Komodo" is the
 * point.
 */
export default function BlogChips({
  categories,
  active,
}: {
  categories: { slug: string; name: string }[];
  active?: string;
}) {
  if (categories.length === 0) return null;

  return (
    <nav className="bp-chips" aria-label="Article categories">
      <Link href="/blog" className={`ds-micro bp-chip${active ? "" : " is-active"}`}>
        Everything
      </Link>
      {categories.map((category) => (
        <Link
          key={category.slug}
          href={`/blog/category/${category.slug}`}
          className={`ds-micro bp-chip${active === category.slug ? " is-active" : ""}`}
          aria-current={active === category.slug ? "page" : undefined}
        >
          {category.name}
        </Link>
      ))}
    </nav>
  );
}
