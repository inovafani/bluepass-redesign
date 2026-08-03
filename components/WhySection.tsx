"use client";

import { useRef } from "react";
import { gsap, useGSAP, reduced } from "@/lib/gsap";
import { whyCards, reefImage } from "@/lib/data";
import ParallaxMedia from "./ui/ParallaxMedia";
import { MaskLines, Words, Rail } from "./ui/Text";

export default function WhySection() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || reduced()) return;

      const cards = gsap.utils.toArray<HTMLElement>(".why__card", el);

      /* Cards deal in from below with a slight downward-facing tilt, so the
         row resolves like a hand of cards being laid flat. */
      gsap.from(cards, {
        y: 90,
        opacity: 0,
        rotateX: -12,
        transformPerspective: 900,
        transformOrigin: "50% 100%",
        duration: 1.25,
        stagger: 0.12,
        ease: "bp-out",
        scrollTrigger: { trigger: ".why__grid", start: "top 82%", once: true },
      });

      /* Each icon glyph draws itself once its card has landed. */
      cards.forEach((card, i) => {
        const path = card.querySelector<SVGPathElement>("path");
        if (!path) return;
        const len = path.getTotalLength();
        gsap.fromTo(
          path,
          { strokeDasharray: len, strokeDashoffset: len },
          {
            strokeDashoffset: 0,
            duration: 1.5,
            ease: "bp-inOut",
            delay: 0.25 + i * 0.12,
            scrollTrigger: { trigger: ".why__grid", start: "top 82%", once: true },
          },
        );
      });

      /* Hover lifts the card and warms its fill a step up the surface ramp. */
      cards.forEach((card) => {
        const enter = () =>
          gsap.to(card, {
            y: -8,
            backgroundColor: "rgba(255,255,255,0.10)",
            borderColor: "var(--color-hairline)",
            duration: 0.5,
            ease: "power3.out",
            overwrite: "auto",
          });
        const leave = () =>
          gsap.to(card, {
            y: 0,
            backgroundColor: "rgba(255,255,255,0.06)",
            borderColor: "var(--color-hairline-soft)",
            duration: 0.6,
            ease: "power3.out",
            overwrite: "auto",
          });
        card.addEventListener("pointerenter", enter);
        card.addEventListener("pointerleave", leave);
      });
    },
    { scope: ref },
  );

  return (
    <section ref={ref} className="section section--gap">
      <ParallaxMedia src={reefImage} alt="" strength={16} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg,rgba(10,10,9,0.55) 0%,rgba(10,10,9,0.75) 100%)",
        }}
      />

      <div
        className="shell pad-y"
        style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center" }}
      >
        <Words
          as="span"
          className="ds-caption"
          text="Why Bluepass"
          style={{ color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: 3 }}
        />
        <MaskLines
          lines={["Better for you. Fairer for", "them. Best for the ocean."]}
          className="ds-display-lg"
          style={{ textAlign: "center", marginTop: 16, maxWidth: 760 }}
        />

        <div className="why__grid" style={{ marginTop: 48, maxWidth: 1200, width: "100%" }}>
          {whyCards.map((card) => (
            <div
              key={card.title}
              className="why__card"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid var(--color-hairline-soft)",
                borderRadius: "var(--radius-lg)",
                padding: 28,
                display: "flex",
                flexDirection: "column",
                gap: 14,
                willChange: "transform",
              }}
            >
              <span
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: "50%",
                  border: "1px solid var(--color-hairline)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flex: "none",
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d={card.iconD} />
                </svg>
              </span>
              <div className="ds-headline" style={{ color: "#ffffff" }}>
                {card.title}
              </div>
              <div className="ds-body-sm" style={{ color: "rgba(255,255,255,0.62)" }}>
                {card.desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Rail label="Why Bluepass" />
    </section>
  );
}
