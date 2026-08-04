"use client";

import { useRef } from "react";
import { MaskLines, Words, Rail } from "./ui/Text";
import ReelCarousel from "./ui/ReelCarousel";

export default function PartnersSection() {
  const ref = useRef<HTMLElement>(null);

  return (
    <section
      ref={ref}
      id="partners"
      className="section section--gap shell"
      style={{ paddingTop: "clamp(64px,7vw,96px)", paddingBottom: 80 }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Words
          as="span"
          className="ds-caption"
          text="Partners"
          style={{ color: "var(--color-ink-muted)", textTransform: "uppercase", letterSpacing: 3 }}
        />
        <MaskLines
          lines={["Filmed by people who", "actually go."]}
          className="ds-display-lg"
          style={{ textAlign: "center", marginTop: 16, maxWidth: 760 }}
        />
      </div>

      <ReelCarousel />

      <Rail label="Partners" tone="dark" />
    </section>
  );
}
