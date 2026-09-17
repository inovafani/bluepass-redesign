"use client";

import { useState } from "react";
import type { SeoReport } from "@/lib/services/blog/seo";

/**
 * The rail beside the editor: how this article will look in a search result, how it will look when
 * someone pastes the link into WhatsApp, and the list of things still wrong with it.
 *
 * The previews sit *above* the checklist deliberately. A list of rules is easy to ignore; seeing
 * your own truncated title sitting in a mock search result is not.
 */

const RING_RADIUS = 26;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export default function SeoPanel({
  report,
  serp,
  social,
}: {
  report: SeoReport;
  serp: { title: string; description: string; slug: string };
  social: { title: string; description: string; image: string };
}) {
  const [open, setOpen] = useState<string | null>(null);
  const failing = report.checks.filter((check) => check.state !== "pass").length;

  return (
    <div className="bpe-rail">
      <section className="bpe-rail__card">
        <h2 className="ds-micro bpe-rail__legend">On Google</h2>
        <div className="bpe-serp">
          <div className="bpe-serp__crumb">
            <span className="bpe-serp__favicon" aria-hidden>
              B
            </span>
            <span>
              <span className="ds-micro bpe-serp__site">Bluepass</span>
              <span className="ds-micro bpe-serp__path">bluepass.co › blog › {serp.slug || "…"}</span>
            </span>
          </div>
          <div className="bpe-serp__title">{truncate(serp.title || "Untitled article", 60)}</div>
          <p className="bpe-serp__desc">
            {truncate(serp.description || "Google will write its own snippet from the page — usually worse than yours.", 160)}
          </p>
        </div>
      </section>

      <section className="bpe-rail__card">
        <h2 className="ds-micro bpe-rail__legend">When someone shares it</h2>
        <div className="bpe-social">
          <div className="bpe-social__thumb">
            {social.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={social.image} alt="" />
            ) : (
              <span className="ds-micro bpe-social__empty">No image — the link will share as bare text</span>
            )}
          </div>
          <div className="bpe-social__body">
            <span className="ds-micro bpe-social__domain">bluepass.co</span>
            <span className="ds-body-sm bpe-social__title">{truncate(social.title || "Untitled article", 70)}</span>
            <span className="ds-micro bpe-social__desc">{truncate(social.description || "", 110)}</span>
          </div>
        </div>
      </section>

      <section className="bpe-rail__card">
        <div className="bpe-score">
          <svg width="66" height="66" viewBox="0 0 66 66" className="bpe-score__ring" aria-hidden>
            <circle cx="33" cy="33" r={RING_RADIUS} className="bpe-score__track" />
            <circle
              cx="33"
              cy="33"
              r={RING_RADIUS}
              className={`bpe-score__fill bpe-score__fill--${toneFor(report.score)}`}
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={RING_CIRCUMFERENCE * (1 - report.score / 100)}
            />
          </svg>
          <div className="bpe-score__copy">
            <span className="ds-headline bpe-score__value">{report.score}</span>
            <span className="ds-micro bpe-score__grade">{report.grade}</span>
            <span className="ds-micro bpe-score__meta">
              {report.passed} of {report.total} checks clear
            </span>
          </div>
        </div>

        <ul className="bpe-checks">
          {report.checks.map((check) => {
            const isOpen = open === check.id;
            return (
              <li key={check.id} className={`bpe-check bpe-check--${check.state}${isOpen ? " is-open" : ""}`}>
                <button
                  type="button"
                  className="bpe-check__row"
                  onClick={() => setOpen(isOpen ? null : check.id)}
                  aria-expanded={isOpen}
                >
                  <span className="bpe-check__dot" aria-hidden />
                  <span className="ds-body-sm bpe-check__label">{check.label}</span>
                  <span className="ds-micro bpe-check__state">
                    {check.state === "pass" ? "Clear" : check.state === "warn" ? "Could be better" : "Fix"}
                  </span>
                </button>
                {isOpen ? <p className="ds-micro bpe-check__detail">{check.detail}</p> : null}
              </li>
            );
          })}
        </ul>

        <p className="ds-micro bpe-rail__note">
          {failing === 0
            ? "Nothing outstanding. Publish it."
            : "None of this blocks publishing — it is the difference between a page that exists and a page that ranks."}
        </p>
      </section>
    </div>
  );
}

function toneFor(score: number) {
  if (score >= 85) return "good";
  if (score >= 55) return "warn";
  return "bad";
}

/** Cuts on a word boundary and marks the cut, the same way a search result does. */
function truncate(value: string, limit: number) {
  if (value.length <= limit) return value;
  return `${value.slice(0, limit - 1).replace(/\s+\S*$/, "")}…`;
}
