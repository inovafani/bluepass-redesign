"use client";

import { useRef } from "react";
import { gsap, useGSAP, reduced } from "@/lib/gsap";
import { reportLines } from "@/lib/conservation";
import { MaskLines, Words } from "../ui/Text";

/**
 * Rather than describing what a report will contain, this renders the report's
 * actual shape with its fields left blank — a template preview. The blanks are
 * deliberate and labelled: no note has been published yet, so inventing figures
 * here would undercut the exact claim the page is making.
 */
export default function ReportAnatomy() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || reduced()) return;

      const tl = gsap.timeline({
        scrollTrigger: { trigger: ".cdoc", start: "top 82%", once: true },
      });

      tl.from(".cdoc", { opacity: 0, y: 50, duration: 1.1, ease: "bp-out" })
        .from(".cdoc__bar", { opacity: 0, y: -10, duration: 0.7 }, "-=0.6")
        .from(".cdoc__block", { opacity: 0, y: 24, duration: 0.9, stagger: 0.12 }, "-=0.4")
        .from(".cdoc__foot", { opacity: 0, duration: 0.8 }, "-=0.3");

      /* Field rules draw in left-to-right, like a form being ruled up. */
      tl.from(
        ".cfield__rule",
        { scaleX: 0, transformOrigin: "left center", duration: 0.8, stagger: 0.04, ease: "bp-inOut" },
        "-=0.9",
      );

      /* One scan pass down the document — it reads as "generated", not static. */
      tl.fromTo(
        ".cdoc__scan",
        { yPercent: -100, opacity: 0 },
        { yPercent: 1100, opacity: 1, duration: 1.6, ease: "power2.inOut" },
        "-=0.6",
      ).to(".cdoc__scan", { opacity: 0, duration: 0.3 }, "-=0.3");
    },
    { scope: ref },
  );

  return (
    <section ref={ref} className="section shell creport-sec">
      <div className="csplit csplit--reverse">
        <div className="csplit__lead">
          <Words
            as="span"
            className="ds-caption csec__eyebrow"
            text="Monthly report"
            style={{ color: "var(--color-ink-muted)", textTransform: "uppercase", letterSpacing: 3 }}
          />
          <MaskLines
            lines={["Reports will be dated,", "readable, and hard to fake."]}
            className="ds-display-lg"
            style={{ marginTop: 16 }}
          />
          <Words
            className="ds-body csplit__support"
            text="Every line ties to a named partner and a booking month. This is the shape each note will take. The fields stay blank until the first one publishes."
          />
          <div className="csplit__marks">
            {reportLines.map((r) => (
              <span key={r.n} className="cmark">
                <span className="cmark__n ds-micro">{r.n}</span>
                <span className="ds-body-sm">{r.title}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="cdoc">
          <span className="cdoc__scan" aria-hidden />

          <div className="cdoc__bar">
            <span className="cdoc__title ds-body-sm">Impact note</span>
            <span className="cdoc__status ds-micro">
              <i />
              Template preview
            </span>
          </div>

          {reportLines.map((r, i) => (
            <div className="cdoc__block" key={r.n}>
              <div className="cdoc__blockHead">
                <span className="cdoc__ring">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d={r.iconD} />
                  </svg>
                </span>
                <span className="cdoc__n ds-micro">{r.n}</span>
                <span className="ds-body-sm cdoc__blockTitle">{r.title}</span>
              </div>

              {i === 0 ? (
                <div className="cfields">
                  {["Partner", "Region", "Amount", "Booking month"].map((f) => (
                    <span className="cfield" key={f}>
                      <span className="cfield__key ds-micro">{f}</span>
                      <span className="cfield__rule" />
                      <span className="cfield__val ds-micro">—</span>
                    </span>
                  ))}
                </div>
              ) : null}

              {i === 1 ? (
                <div className="cproofs">
                  <span className="cproof">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="5" width="18" height="14" rx="2" />
                      <circle cx="8.5" cy="10" r="1.5" />
                      <path d="M21 16l-5-5-6 6" />
                    </svg>
                    <span className="ds-micro">Photos</span>
                  </span>
                  <span className="cproof">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
                      <path d="M9 8h6M9 12h6" />
                    </svg>
                    <span className="ds-micro">Receipts</span>
                  </span>
                  <span className="cproof">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 5h16M4 10h16M4 15h10" />
                    </svg>
                    <span className="ds-micro">Field notes</span>
                  </span>
                </div>
              ) : null}

              {i === 2 ? (
                <div className="cfields">
                  {["Next project", "Region", "Target month"].map((f) => (
                    <span className="cfield" key={f}>
                      <span className="cfield__key ds-micro">{f}</span>
                      <span className="cfield__rule" />
                      <span className="cfield__val ds-micro">—</span>
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ))}

          <div className="cdoc__foot ds-micro">
            Published monthly · signed by the named partner · first note lands as bookings begin
          </div>
        </div>
      </div>
    </section>
  );
}
