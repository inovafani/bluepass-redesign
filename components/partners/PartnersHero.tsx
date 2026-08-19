"use client";

import Link from "next/link";
import { useRef } from "react";
import { gsap, useGSAP, reduced } from "@/lib/gsap";
import { heroImage } from "@/lib/partners";
import ParallaxMedia from "../ui/ParallaxMedia";
import { MaskLines, Rail } from "../ui/Text";
import Button from "../ui/Button";

/** Same page-hero system as Discover and Conservation. */
export default function PartnersHero() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || reduced()) return;

      gsap
        .timeline({ delay: 0.3 })
        .from(".phero__badge", { opacity: 0, y: 18, duration: 0.9 }, 0.35)
        .from(".phero__copy", { opacity: 0, y: 24, duration: 1 }, 1.3)
        .from(".phero__ctas > *", { opacity: 0, y: 20, duration: 0.9, stagger: 0.09 }, 1.45)
        .from(".pflow", { opacity: 0, y: 26, duration: 1 }, 1.6)
        .from(".pflow__step", { opacity: 0, x: -16, duration: 0.8, stagger: 0.1 }, 1.7)
        .from(
          ".pflow__arrow",
          { opacity: 0, scaleX: 0, transformOrigin: "left center", duration: 0.6, stagger: 0.1 },
          1.85,
        );

      gsap
        .timeline({ scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: 0.6 } })
        .to(".phero__content", { y: -90, opacity: 0, ease: "none" }, 0);
    },
    { scope: ref },
  );

  return (
    <section ref={ref} className="section phero">
      <ParallaxMedia src={heroImage} alt="" strength={16} intro priority />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(10,10,9,0.6) 0%, rgba(10,10,9,0.34) 42%, rgba(10,10,9,0.9) 100%)",
        }}
      />

      <div className="phero__content shell">
        <span className="phero__badge ds-caption">
          <i />
          Founding cohort 2026 · 5% locked
        </span>

        <MaskLines
          as="h1"
          className="ds-display-xl"
          lines={["Send your divers to", "Indonesia's best operators."]}
          mode="load"
          delay={0.6}
          stagger={0.14}
        />

        <p className="phero__copy ds-body-lg">
          They pay the operator&apos;s own rate. You earn on every booking. Every trip funds reef
          conservation in the exact place they dive.
        </p>

        <div className="phero__ctas">
          <Link href="/partners/apply" style={{ textDecoration: "none" }}>
            <Button variant="primary" large>
              Claim my founding-partner link
            </Button>
          </Link>
          <Link href="#claim" style={{ textDecoration: "none" }}>
            <Button variant="translucent" large>
              Chat on WhatsApp
            </Button>
          </Link>
        </div>

        {/* The money path in one line — the question every partner asks first. */}
        <div className="pflow">
          <span className="pflow__step">
            <span className="ds-micro pflow__k">Client pays</span>
            <span className="ds-body-sm pflow__v">Operator&apos;s rate</span>
          </span>
          <span className="pflow__arrow" aria-hidden />
          <span className="pflow__step">
            <span className="ds-micro pflow__k">You earn</span>
            <span className="ds-body-sm pflow__v">Referral commission</span>
          </span>
          <span className="pflow__arrow" aria-hidden />
          <span className="pflow__step">
            <span className="ds-micro pflow__k">Reef gets</span>
            <span className="ds-body-sm pflow__v pflow__v--ocean">5% of the fare</span>
          </span>
        </div>
      </div>

      <Rail label="Partners" />
    </section>
  );
}
