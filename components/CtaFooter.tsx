"use client";

import { useRef } from "react";
import { gsap, useGSAP, reduced } from "@/lib/gsap";
import { sunsetImage } from "@/lib/data";
import ParallaxMedia from "./ui/ParallaxMedia";
import { MaskLines, Rail } from "./ui/Text";
import Button from "./ui/Button";
import SiteFooter from "./SiteFooter";

const SCRIM = 0.6;

export default function CtaFooter() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (reduced()) return;
      gsap
        .timeline({ scrollTrigger: { trigger: ".cta", start: "top 65%", once: true } })
        .from(".cta__ctas > *", { opacity: 0, y: 26, duration: 1, stagger: 0.1 }, 0.5)
        .from(".cta__note", { opacity: 0, duration: 0.9 }, 0.8);
    },
    { scope: ref },
  );

  return (
    <section ref={ref} className="section section--gap">
      <div
        className="cta"
        style={{
          position: "relative",
          minHeight: 600,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <ParallaxMedia src={sunsetImage} alt="" strength={20} />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(180deg, rgba(10,10,9,${(SCRIM * 0.4).toFixed(
              2,
            )}) 0%, rgba(10,10,9,${SCRIM}) 100%)`,
          }}
        />

        <div
          className="shell"
          style={{
            position: "relative",
            zIndex: 2,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: 22,
            paddingTop: "clamp(64px,7vw,96px)",
            paddingBottom: "clamp(64px,7vw,96px)",
          }}
        >
          <MaskLines lines={["Book the ocean.", "Leave it better."]} className="ds-display-lg" stagger={0.13} />
          <div className="cta__ctas" style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            <Button variant="primary" large>
              Explore trips
            </Button>
            <Button variant="translucent" large>
              Ask Kai →
            </Button>
          </div>
          <span className="cta__note ds-micro" style={{ color: "rgba(255,255,255,0.55)" }}>
            or continue on WhatsApp
          </span>
        </div>

        <Rail label="Book" />
      </div>

      <SiteFooter />
    </section>
  );
}
