"use client";

import Link from "next/link";
import { useRef } from "react";
import { gsap, useGSAP, reduced } from "@/lib/gsap";
import { ctaImage } from "@/lib/conservation";
import ParallaxMedia from "../ui/ParallaxMedia";
import { MaskLines } from "../ui/Text";
import Button from "../ui/Button";

/** No panel — the mark, the line and the button sit straight on the photograph. */
export default function ConservationCta() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || reduced()) return;

      gsap
        .timeline({ scrollTrigger: { trigger: el, start: "top 70%", once: true } })
        .from(".ccta__mark", { opacity: 0, scale: 1.3, duration: 1.6, ease: "bp-out" }, 0)
        .from(".ccta__copy", { opacity: 0, y: 22, duration: 1 }, 0.75)
        .from(".ccta__btn", { opacity: 0, y: 22, duration: 1 }, 0.9);

      /* The oversized numeral drifts against the photo as the band scrolls. */
      gsap.fromTo(
        ".ccta__mark",
        { yPercent: 8 },
        {
          yPercent: -8,
          ease: "none",
          scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 1 },
        },
      );
    },
    { scope: ref },
  );

  return (
    <section ref={ref} className="section ccta">
      <ParallaxMedia src={ctaImage} alt="" strength={20} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg,rgba(10,10,9,0.55) 0%,rgba(10,10,9,0.72) 100%)",
        }}
      />

      <span className="ccta__mark" aria-hidden>
        5%
      </span>

      <div className="shell ccta__shell">
        <MaskLines
          lines={["Every booking you make", "funds the water you swim in."]}
          className="ds-display-lg ccta__title"
          stagger={0.12}
        />
        <p className="ccta__copy ds-body-lg">
          Bluepass will publish named partners, dated updates, and monthly notes as bookings begin
          moving through the marketplace.
        </p>
        <span className="ccta__btn">
          <Link href="/discover" style={{ textDecoration: "none" }}>
            <Button variant="primary" large>
              Find a trip that funds the reef →
            </Button>
          </Link>
        </span>
      </div>
    </section>
  );
}
