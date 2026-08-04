"use client";

import { useRef } from "react";
import { gsap, useGSAP, reduced } from "@/lib/gsap";
import { steps } from "@/lib/discover";
import { MaskLines, Words } from "../ui/Text";

export default function HowItWorks() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || reduced()) return;

      const cards = gsap.utils.toArray<HTMLElement>(".step", el);

      gsap.from(cards, {
        opacity: 0,
        y: 60,
        duration: 1.15,
        stagger: 0.12,
        ease: "bp-out",
        scrollTrigger: { trigger: ".steps", start: "top 84%", once: true },
      });

      /* The connecting rule draws left to right across the row as they land. */
      gsap.fromTo(
        ".steps__rule",
        { scaleX: 0, transformOrigin: "left center" },
        {
          scaleX: 1,
          duration: 1.4,
          ease: "bp-inOut",
          scrollTrigger: { trigger: ".steps", start: "top 84%", once: true },
        },
      );

      cards.forEach((card, i) => {
        const path = card.querySelector<SVGPathElement>(".step__icon path");
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
              scrollTrigger: { trigger: ".steps", start: "top 84%", once: true },
            },
          );
        }

        const ring = card.querySelector(".step__ring");
        card.addEventListener("pointerenter", () =>
          gsap.to(ring, { borderColor: "rgba(255,255,255,0.5)", scale: 1.07, duration: 0.45, overwrite: "auto" }),
        );
        card.addEventListener("pointerleave", () =>
          gsap.to(ring, { borderColor: "var(--color-hairline)", scale: 1, duration: 0.5, overwrite: "auto" }),
        );
      });
    },
    { scope: ref },
  );

  return (
    <section ref={ref} className="section shell" style={{ paddingBottom: "clamp(64px,7vw,96px)" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <Words
          as="span"
          className="ds-caption"
          text="How booking works"
          style={{ color: "var(--color-ink-muted)", textTransform: "uppercase", letterSpacing: 3 }}
        />
        <MaskLines
          lines={["Three steps. No markup."]}
          className="ds-display-lg"
          style={{ marginTop: 16, maxWidth: 760 }}
        />
      </div>

      <div className="steps">
        <span className="steps__rule" aria-hidden />
        {steps.map((s) => (
          <div key={s.n} className="step">
            <div className="step__top">
              <span className="step__ring">
                <svg
                  className="step__icon"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d={s.iconD} />
                </svg>
              </span>
              <span className="step__n ds-micro">{s.n}</span>
            </div>
            <div className="ds-headline step__title">{s.title}</div>
            <p className="ds-body-sm step__desc">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
