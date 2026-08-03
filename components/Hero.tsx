"use client";

import { useRef } from "react";
import { gsap, useGSAP, reduced } from "@/lib/gsap";
import { heroImage } from "@/lib/data";
import ParallaxMedia from "./ui/ParallaxMedia";
import { MaskLines, Rail } from "./ui/Text";
import Button from "./ui/Button";

const SCRIM = 0.6; // heroScrimStrength default from the design's prop schema

export default function Hero() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || reduced()) return;

      const eyebrow = el.querySelector(".hero__eyebrow");
      const copy = el.querySelector(".hero__copy");
      const ctas = el.querySelector(".hero__ctas");
      const note = el.querySelector(".hero__note");
      const scrim = el.querySelector(".hero__scrim");
      const cue = el.querySelector(".hero__cue-line");

      /* ---- load ------------------------------------------------------ */
      const tl = gsap.timeline({ delay: 0.25 });
      tl.from(scrim, { opacity: 0, duration: 1.6, ease: "power2.out" }, 0)
        .from(eyebrow, { opacity: 0, y: 20, duration: 1 }, 0.45)
        // headline handles itself (MaskLines mode="load", delay 0.7)
        .from(copy, { opacity: 0, y: 26, duration: 1.1 }, 1.35)
        .from(
          ctas ? Array.from(ctas.children) : [],
          { opacity: 0, y: 22, duration: 1, stagger: 0.09 },
          1.5,
        )
        .from(note, { opacity: 0, duration: 1 }, 1.75);

      /* ---- the scroll cue keeps drawing itself downward -------------- */
      if (cue) {
        gsap.fromTo(
          cue,
          { scaleY: 0, transformOrigin: "top" },
          {
            scaleY: 1,
            duration: 1.4,
            ease: "power2.inOut",
            repeat: -1,
            repeatDelay: 0.15,
            yoyo: false,
            onRepeat: () => gsap.set(cue, { transformOrigin: "top" }),
          },
        );
      }

      /* ---- scroll-out: content lifts and dissolves ------------------- */
      gsap
        .timeline({
          scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: 0.6 },
        })
        .to(".hero__content", { y: -110, opacity: 0, ease: "none" }, 0)
        .to(".hero__cue", { opacity: 0, ease: "none", duration: 0.2 }, 0)
        .fromTo(".hero__dim", { opacity: 0 }, { opacity: 0.5, ease: "none" }, 0);
    },
    { scope: ref },
  );

  return (
    <section
      ref={ref}
      className="section hero"
      style={{
        minHeight: "min(800px, 100svh)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <ParallaxMedia
        src={heroImage}
        alt="Aerial view of an island coastline — surf, sail and dive country"
        strength={18}
        intro
        priority
      />
      <div
        className="hero__scrim"
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(180deg, rgba(10,10,9,${(SCRIM * 0.35).toFixed(2)}) 0%, rgba(10,10,9,${(
            SCRIM * 0.22
          ).toFixed(2)}) 40%, rgba(10,10,9,${SCRIM}) 100%)`,
        }}
      />
      <div className="hero__dim" style={{ position: "absolute", inset: 0, background: "#0a0a09", opacity: 0 }} />

      <div
        className="hero__content"
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: 26,
          padding: "clamp(120px, 14vw, 160px) clamp(20px, 4.4vw, 64px)",
          maxWidth: 920,
        }}
      >
        <span
          className="hero__eyebrow ds-caption"
          style={{ color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: 3 }}
        >
          Surf · Sail · Dive
        </span>

        <MaskLines
          as="h1"
          className="ds-display-xl"
          lines={["Book the ocean.", "Leave it better."]}
          mode="load"
          delay={0.7}
          stagger={0.14}
        />

        <p
          className="hero__copy ds-body-lg"
          style={{ color: "rgba(255,255,255,0.75)", maxWidth: 560 }}
        >
          Vetted operators for surf, sail and dive — at the same price as booking direct.
        </p>

        <div className="hero__ctas" style={{ display: "flex", gap: 12, marginTop: 6, flexWrap: "wrap", justifyContent: "center" }}>
          <Button variant="primary" large>
            Explore trips
          </Button>
          <Button variant="translucent" large>
            Ask Kai →
          </Button>
        </div>

        <span className="hero__note ds-micro" style={{ color: "rgba(255,255,255,0.55)", marginTop: 6 }}>
          Live now in Komodo &amp; Raja Ampat — continue on WhatsApp
        </span>
      </div>

      <div
        className="hero__cue"
        style={{
          position: "absolute",
          left: "50%",
          bottom: 28,
          zIndex: 2,
          width: 1,
          height: 52,
          background: "rgba(255,255,255,0.14)",
          overflow: "hidden",
        }}
      >
        <span
          className="hero__cue-line"
          style={{ display: "block", width: "100%", height: "100%", background: "rgba(255,255,255,0.85)" }}
        />
      </div>

      <Rail label="The promise" />
    </section>
  );
}
