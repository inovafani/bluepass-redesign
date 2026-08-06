"use client";

import Link from "next/link";
import { useRef } from "react";
import { gsap, useGSAP, reduced } from "@/lib/gsap";
import { heroImage } from "@/lib/conservation";
import ParallaxMedia from "../ui/ParallaxMedia";
import { MaskLines, Rail } from "../ui/Text";
import Button from "../ui/Button";

/** Same shell, badge and type scale as the Discover hero — one page-hero system. */
export default function ConservationHero() {
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
        .from(".chero__ledger", { opacity: 0, y: 26, duration: 1 }, 1.55)
        .from(
          ".chero__ledger .cledger__row",
          { opacity: 0, x: -14, duration: 0.8, stagger: 0.08 },
          1.7,
        );

      /* The split bar fills to its real proportions rather than just appearing. */
      gsap.fromTo(
        ".cledger__fill",
        { scaleX: 0, transformOrigin: "left center" },
        { scaleX: 1, duration: 1.3, ease: "bp-inOut", delay: 1.9 },
      );

      const pct = el.querySelector<HTMLElement>(".cledger__pct");
      if (pct) {
        const o = { v: 0 };
        gsap.to(o, {
          v: 5,
          duration: 1.2,
          delay: 1.9,
          ease: "bp-out",
          onUpdate: () => {
            pct.textContent = `${Math.round(o.v)}%`;
          },
        });
      }

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
            "linear-gradient(180deg, rgba(10,10,9,0.62) 0%, rgba(10,10,9,0.34) 42%, rgba(10,10,9,0.9) 100%)",
        }}
      />

      <div className="phero__content shell">
        <span className="phero__badge ds-caption">
          <i />
          Every booking, every region — no exceptions
        </span>

        <MaskLines
          as="h1"
          className="ds-display-xl"
          lines={["5% of every booking", "goes back to the ocean."]}
          mode="load"
          delay={0.6}
          stagger={0.14}
        />

        <p className="phero__copy ds-body-lg">
          Conservation cannot be a footer promise. Bluepass is building the reporting layer that
          shows where booking contributions go, when they move, and which partners are responsible.
        </p>

        <div className="phero__ctas">
          <Link href="/" style={{ textDecoration: "none" }}>
            <Button variant="primary" large>
              Find a trip
            </Button>
          </Link>
          <Link href="#partners" style={{ textDecoration: "none" }}>
            <Button variant="translucent" large>
              See partners
            </Button>
          </Link>
        </div>

        {/* The claim, shown rather than stated — where a fare actually splits. */}
        <div className="chero__ledger cledger">
          <div className="cledger__bar" aria-hidden>
            <span className="cledger__fill cledger__fill--operator" />
            <span className="cledger__fill cledger__fill--ocean" />
          </div>
          <div className="cledger__rows">
            <span className="cledger__row">
              <i className="cledger__key cledger__key--operator" />
              <span className="ds-body-sm">Operator&apos;s rate</span>
              <b className="ds-body-sm">95%</b>
            </span>
            <span className="cledger__row">
              <i className="cledger__key cledger__key--ocean" />
              <span className="ds-body-sm">Reserved for the ocean</span>
              <b className="ds-body-sm cledger__pct">5%</b>
            </span>
            <span className="cledger__row cledger__row--note ds-micro">
              Bluepass&apos; commission comes from the operator&apos;s side — never added to your fare.
            </span>
          </div>
        </div>
      </div>

      <Rail label="Conservation" />
    </section>
  );
}
