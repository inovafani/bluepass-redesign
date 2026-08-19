"use client";

import Link from "next/link";
import { useRef } from "react";
import { gsap, useGSAP, reduced } from "@/lib/gsap";
import { MaskLines } from "../ui/Text";
import Button from "../ui/Button";

/**
 * Flat canvas rather than another photograph — every other closing band on the
 * site is photo-backed, and this one lands harder as a quiet, ruled panel.
 * The frame draws itself around the block on entry.
 */
export default function PartnersCta() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || reduced()) return;

      gsap
        .timeline({ scrollTrigger: { trigger: el, start: "top 72%", once: true } })
        .fromTo(
          ".pcta__edge--h",
          { scaleX: 0 },
          { scaleX: 1, duration: 1.1, ease: "bp-inOut", stagger: 0.1 },
          0,
        )
        .fromTo(
          ".pcta__edge--v",
          { scaleY: 0 },
          { scaleY: 1, duration: 1.1, ease: "bp-inOut", stagger: 0.1 },
          0.15,
        )
        .from(".pcta__badge", { opacity: 0, y: 16, duration: 0.8 }, 0.35)
        .from(".pcta__copy", { opacity: 0, y: 22, duration: 1 }, 0.95)
        .from(".pcta__btn", { opacity: 0, y: 22, duration: 1 }, 1.05)
        .from(".pcta__note", { opacity: 0, duration: 0.9 }, 1.2);
    },
    { scope: ref },
  );

  return (
    <section ref={ref} id="claim" className="section shell pcta-sec">
      <div className="pcta">
        <span className="pcta__edge pcta__edge--h pcta__edge--top" aria-hidden />
        <span className="pcta__edge pcta__edge--h pcta__edge--bottom" aria-hidden />
        <span className="pcta__edge pcta__edge--v pcta__edge--left" aria-hidden />
        <span className="pcta__edge pcta__edge--v pcta__edge--right" aria-hidden />

        <span className="pcta__badge ds-caption">
          <i />
          Founding cohort 2026
        </span>

        <MaskLines
          lines={["Claim your", "founding-partner link."]}
          className="ds-display-lg pcta__title"
          stagger={0.12}
        />

        <p className="pcta__copy ds-body-lg">
          Lock 5% for the founding cohort, get your tracked link and operator catalogue, and put a
          reef-impact story in front of your clients.
        </p>

        <span className="pcta__btn">
          <Link href="/partners/apply" style={{ textDecoration: "none" }}>
            <Button variant="primary" large>
              Claim my 5% founding link
            </Button>
          </Link>
        </span>

        <span className="pcta__note ds-micro">
          Booking → project · no sales calls · never a markup · 5% to the reef
        </span>
      </div>
    </section>
  );
}
