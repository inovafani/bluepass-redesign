"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { AdminBlogPostRow } from "@/lib/services/blog/posts";

/**
 * The article index.
 *
 * Filtering happens in the browser over the full list rather than by re-querying: a blog is a few
 * hundred rows at most, and a search box that answers on the keystroke is worth more here than a
 * paginated query that is correct at a scale this table will not reach.
 *
 * "Needs SEO" is the filter that earns its place — it is the working queue. A post with no focus
 * keyword or no meta description is published and invisible, which is the failure mode this whole
 * CMS exists to prevent.
 */

type Filter = "all" | "published" | "draft" | "needs-seo";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "published", label: "Published" },
  { id: "draft", label: "Drafts" },
  { id: "needs-seo", label: "Needs SEO" },
];

function needsSeo(post: AdminBlogPostRow) {
  return !post.focusKeyword || !post.metaDescription || !post.heroImageUrl;
}

export default function BlogPostList({ posts }: { posts: AdminBlogPostRow[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const counts = useMemo(
    () => ({
      all: posts.length,
      published: posts.filter((post) => post.status === "PUBLISHED").length,
      draft: posts.filter((post) => post.status === "DRAFT").length,
      "needs-seo": posts.filter(needsSeo).length,
    }),
    [posts],
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return posts.filter((post) => {
      if (filter === "published" && post.status !== "PUBLISHED") return false;
      if (filter === "draft" && post.status !== "DRAFT") return false;
      if (filter === "needs-seo" && !needsSeo(post)) return false;
      if (!needle) return true;
      return [post.title, post.slug, post.focusKeyword ?? "", post.category?.name ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [posts, query, filter]);

  return (
    <div className="bpl">
      <div className="bpl__controls">
        <span className="afield__well bpl__search">
          <span className="afield__icon" aria-hidden>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.6-3.6" />
            </svg>
          </span>
          <input
            className="afield__input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by title, URL, keyword or category"
            aria-label="Search articles"
          />
        </span>

        <div className="bpl__filters" role="tablist" aria-label="Filter articles">
          {FILTERS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={filter === entry.id}
              className={`ds-micro bpl__filter${filter === entry.id ? " is-active" : ""}`}
              onClick={() => setFilter(entry.id)}
            >
              {entry.label}
              <span className="bpl__filter-count">{counts[entry.id]}</span>
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="adm-card adm-empty">
          <p className="ds-body-sm adm-empty__body">
            {posts.length === 0
              ? "No articles yet. The first one is the one that starts ranking — write it."
              : "Nothing matches that filter."}
          </p>
        </div>
      ) : (
        <ul className="bpl__rows">
          {visible.map((post) => (
            <li key={post.id} className="bpl-row">
              <div className="bpl-row__thumb" aria-hidden>
                {post.heroImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={post.heroImageUrl} alt="" />
                ) : (
                  <span className="bpl-row__thumb-empty" />
                )}
              </div>

              <div className="bpl-row__body">
                <div className="bpl-row__top">
                  <Link href={`/admin/blog/${post.id}`} className="ds-body-lg bpl-row__title">
                    {post.title || "Untitled article"}
                  </Link>
                  <span className={`ds-micro bpl-row__status bpl-row__status--${post.status.toLowerCase()}`}>
                    {post.status === "PUBLISHED" ? "Live" : "Draft"}
                  </span>
                  {post.noindex ? (
                    <span className="ds-micro bpl-row__status bpl-row__status--noindex" title="noindex — deliberately kept out of search">
                      Hidden
                    </span>
                  ) : null}
                  {post.category ? <span className="ds-micro bpl-row__cat">{post.category.name}</span> : null}
                </div>

                <div className="bpl-row__meta">
                  <span className="ds-micro bpl-row__slug">/blog/{post.slug}</span>
                  <span className="ds-micro">{post.readingMinutes} min</span>
                  <span className="ds-micro">{post.wordCount.toLocaleString()} words</span>
                  <span className="ds-micro">
                    {post.publishedAt
                      ? formatDate(post.publishedAt)
                      : `Edited ${formatDate(post.updatedAt)}`}
                  </span>
                  {post.focusKeyword ? (
                    <span className="ds-micro bpl-row__kw">{post.focusKeyword}</span>
                  ) : (
                    <span className="ds-micro bpl-row__kw bpl-row__kw--missing">No focus keyword</span>
                  )}
                </div>
              </div>

              <div className="bpl-row__actions">
                {post.status === "PUBLISHED" ? (
                  <a href={`/blog/${post.slug}`} target="_blank" rel="noreferrer" className="ds-micro bpl-row__action">
                    View
                  </a>
                ) : null}
                <Link href={`/admin/blog/${post.id}`} className="ds-micro bpl-row__action bpl-row__action--edit">
                  Edit
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* en-GB, matching the rest of the console — an admin reading a date should never have to work out
   whether 04/09 is April or September. */
function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
