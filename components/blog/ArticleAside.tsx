"use client";

import { useEffect, useState } from "react";
import type { ArticleHeading } from "@/lib/services/blog/markdown";

/**
 * The contents rail beside a long article, with the section you are currently reading marked.
 *
 * Two jobs, and the second is the one that pays: a reader gets a skim path, and Google gets a set
 * of in-page anchors it can offer as jump-to links directly in the search result. Only H2s are
 * listed — a rail that mirrors every H3 stops being a map and becomes the article again.
 */
export default function ArticleAside({ headings, shareUrl, title }: { headings: ArticleHeading[]; shareUrl: string; title: string }) {
  const sections = headings.filter((heading) => heading.level === 2);
  const [active, setActive] = useState<string | null>(sections[0]?.id ?? null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (sections.length === 0) return;

    /* Top-weighted root margin: a heading counts as "current" once it reaches the upper third of
       the viewport, which is where a reader's eye actually is — waiting for it to hit the very top
       leaves the rail a section behind all the way down the page. */
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length > 0) setActive(visible[0].target.id);
      },
      { rootMargin: "-88px 0px -66% 0px", threshold: 0 },
    );

    for (const section of sections) {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    }

    return () => observer.disconnect();
  }, [sections]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard permission can simply be refused; the share links below still work.
      setCopied(false);
    }
  };

  return (
    <aside className="bp-aside">
      {sections.length > 1 ? (
        <nav className="bp-toc" aria-label="On this page">
          <span className="ds-micro bp-toc__legend">On this page</span>
          <ol className="bp-toc__list">
            {sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className={`ds-body-sm bp-toc__link${active === section.id ? " is-active" : ""}`}
                >
                  {section.text}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      <div className="bp-share">
        <span className="ds-micro bp-share__legend">Share</span>
        <div className="bp-share__row">
          <a
            className="ds-micro bp-share__btn"
            href={`https://wa.me/?text=${encodeURIComponent(`${title} ${shareUrl}`)}`}
            target="_blank"
            rel="noreferrer noopener"
          >
            WhatsApp
          </a>
          <a
            className="ds-micro bp-share__btn"
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
            target="_blank"
            rel="noreferrer noopener"
          >
            LinkedIn
          </a>
          <a
            className="ds-micro bp-share__btn"
            href={`https://x.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(shareUrl)}`}
            target="_blank"
            rel="noreferrer noopener"
          >
            X
          </a>
          <button type="button" className="ds-micro bp-share__btn" onClick={copy}>
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      </div>
    </aside>
  );
}
