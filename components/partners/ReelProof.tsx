"use client";

import { useRef } from "react";
import { MaskLines, Words, Rail } from "../ui/Text";
import ReelCarousel from "../ui/ReelCarousel";

/** Same carousel rig as the home page — literally the same component. */
export default function ReelProof() {
  const ref = useRef<HTMLElement>(null);

  return (
    <section ref={ref} className="section shell preels-sec">
      <div className="preels__head">
        <div>
          <Words
            as="span"
            className="ds-caption csec__eyebrow"
            text="Most viewed reels"
            style={{ color: "var(--color-ink-muted)", textTransform: "uppercase", letterSpacing: 3 }}
          />
          <MaskLines
            lines={["Proof that trust has", "a visual language."]}
            className="ds-display-lg"
            style={{ marginTop: 16 }}
          />
        </div>
        <Words
          className="ds-body preels__support"
          text="These are not ad units. They are the kind of ocean stories that make a client ask, “Can we do that trip?”"
        />
      </div>

      <ReelCarousel />

      <Rail label="Reels" tone="dark" />
    </section>
  );
}
