"use client";

import { useRef } from "react";
import { gsap, useGSAP, reduced } from "@/lib/gsap";
import { moves, movePills, operatorRegions } from "@/lib/partners";
import { MaskLines, Words, Rail } from "../ui/Text";

/**
 * Four steps as a descending stair rather than a flat row — each card sits a
 * step lower than the last, with the connecting rule running diagonally
 * through the numbers. It reads as a sequence at a glance, which four equal
 * boxes in a row never do.
 */
export default function QuietMoves() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || reduced()) return;

      const cards = gsap.utils.toArray<HTMLElement>(".pmove", el);

      gsap.from(cards, {
        opacity: 0,
        y: 60,
        duration: 1.1,
        stagger: 0.11,
        ease: "bp-out",
        scrollTrigger: { trigger: ".pmoves", start: "top 82%", once: true },
      });

      /* The diagonal path is drawn, not faded — it's the sequence itself. */
      const line = el.querySelector<SVGPathElement>(".pmoves__path path");
      if (line) {
        const len = line.getTotalLength();
        gsap.fromTo(
          line,
          { strokeDasharray: len, strokeDashoffset: len },
          {
            strokeDashoffset: 0,
            duration: 2,
            ease: "bp-inOut",
            scrollTrigger: { trigger: ".pmoves", start: "top 82%", once: true },
          },
        );
      }

      gsap.from(".pmove__dot", {
        scale: 0,
        duration: 0.7,
        stagger: 0.11,
        delay: 0.35,
        ease: "back.out(3)",
        scrollTrigger: { trigger: ".pmoves", start: "top 82%", once: true },
      });

      gsap.from(".pregions .pchip", {
        opacity: 0,
        y: 14,
        duration: 0.7,
        stagger: 0.05,
        scrollTrigger: { trigger: ".pregions", start: "top 92%", once: true },
      });

      cards.forEach((card) => {
        card.addEventListener("pointerenter", () =>
          gsap.to(card, {
            y: "-=10",
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
    <section ref={ref} className="section shell pmoves-sec">
      <div className="pmoves__head">
        <div>
          <Words
            as="span"
            className="ds-caption csec__eyebrow"
            text="How it works"
            style={{ color: "var(--color-ink-muted)", textTransform: "uppercase", letterSpacing: 3 }}
          />
          <MaskLines lines={["Four quiet moves."]} className="ds-display-lg" style={{ marginTop: 16 }} />
        </div>
        <div className="pmoves__pills">
          {movePills.map((p) => (
            <span key={p} className="pchip pchip--ghost ds-micro">
              {p}
            </span>
          ))}
        </div>
      </div>

      <div className="pmoves">
        <svg className="pmoves__path" viewBox="0 0 1000 220" preserveAspectRatio="none" aria-hidden>
          <path
            d="M40 26 L 290 90 L 540 154 L 790 218"
            fill="none"
            stroke="rgba(255,255,255,0.16)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {moves.map((m, i) => (
          <article key={m.n} className="pmove" style={{ "--step": i } as React.CSSProperties}>
            <div className="pmove__top">
              <span className="pmove__dot" aria-hidden />
              <span className="pmove__n ds-micro">{m.n}</span>
              <span className="pmove__kicker ds-micro">{m.kicker}</span>
            </div>
            <span className="pmove__ring">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d={m.iconD} />
              </svg>
            </span>
            <h3 className="ds-headline pmove__title">{m.title}</h3>
            <p className="ds-body-sm pmove__desc">{m.desc}</p>
          </article>
        ))}
      </div>

      <div className="pregions">
        <span className="ds-micro pregions__label">Operators across</span>
        {operatorRegions.map((r) => (
          <span key={r} className="pchip ds-micro">
            {r}
          </span>
        ))}
      </div>

      <Rail label="How it works" tone="dark" />
    </section>
  );
}
