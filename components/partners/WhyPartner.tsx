"use client";

import { useRef } from "react";
import { gsap, useGSAP, reduced } from "@/lib/gsap";
import { beats, stats } from "@/lib/partners";
import { MaskLines, Words } from "../ui/Text";

/**
 * The reference ran three numbered cards and then a second row repeating the
 * same three benefits. Folded into one: each beat carries its own payoff, so
 * the section says it once and reads denser for it.
 */
export default function WhyPartner() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || reduced()) return;

      gsap.from(".pstat", {
        opacity: 0,
        y: 26,
        duration: 1,
        stagger: 0.1,
        ease: "bp-out",
        scrollTrigger: { trigger: ".pstats", start: "top 88%", once: true },
      });

      const cards = gsap.utils.toArray<HTMLElement>(".pbeat", el);
      gsap.from(cards, {
        opacity: 0,
        y: 54,
        duration: 1.15,
        stagger: 0.12,
        ease: "bp-out",
        scrollTrigger: { trigger: ".pbeats", start: "top 84%", once: true },
      });

      /* The rule running through the beat numbers draws across the row. */
      gsap.fromTo(
        ".pbeats__rule",
        { scaleX: 0, transformOrigin: "left center" },
        {
          scaleX: 1,
          duration: 1.5,
          ease: "bp-inOut",
          scrollTrigger: { trigger: ".pbeats", start: "top 84%", once: true },
        },
      );

      cards.forEach((card, i) => {
        const path = card.querySelector<SVGPathElement>(".pbeat__icon path");
        if (path) {
          const len = path.getTotalLength();
          gsap.fromTo(
            path,
            { strokeDasharray: len, strokeDashoffset: len },
            {
              strokeDashoffset: 0,
              duration: 1.4,
              ease: "bp-inOut",
              delay: 0.3 + i * 0.12,
              scrollTrigger: { trigger: ".pbeats", start: "top 84%", once: true },
            },
          );
        }
        card.addEventListener("pointerenter", () =>
          gsap.to(card, {
            y: -8,
            borderColor: "var(--color-hairline)",
            duration: 0.5,
            ease: "power3.out",
            overwrite: "auto",
          }),
        );
        card.addEventListener("pointerleave", () =>
          gsap.to(card, {
            y: 0,
            borderColor: "var(--color-hairline-soft)",
            duration: 0.55,
            ease: "power3.out",
            overwrite: "auto",
          }),
        );
      });
    },
    { scope: ref },
  );

  return (
    <section ref={ref} className="section shell pwhy">
      <div className="pwhy__head">
        <div>
          <Words
            as="span"
            className="ds-caption csec__eyebrow"
            text="Why partner with Bluepass"
            style={{ color: "var(--color-ink-muted)", textTransform: "uppercase", letterSpacing: 3 }}
          />
          <MaskLines
            lines={["One trusted recommendation.", "A cleaner booking path."]}
            className="ds-display-lg"
            style={{ marginTop: 16 }}
          />
        </div>

        <div className="pstats">
          {stats.map((s) => (
            <div key={s.label} className="pstat">
              <span className="pstat__v">{s.value}</span>
              <span className="pstat__l ds-micro">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="pbeats">
        <span className="pbeats__rule" aria-hidden />
        {beats.map((b) => (
          <article key={b.n} className="pbeat">
            <div className="pbeat__top">
              <span className="pbeat__n ds-micro">{b.n}</span>
              <span className="pbeat__ring">
                <svg
                  className="pbeat__icon"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d={b.iconD} />
                </svg>
              </span>
            </div>

            <h3 className="ds-headline pbeat__title">{b.title}</h3>
            <p className="ds-body-sm pbeat__sub">{b.sub}</p>

            <div className="pbeat__tag">
              <span className="ds-micro pbeat__tagName">{b.tag}</span>
              <span className="ds-micro pbeat__tagNote">{b.tagNote}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
