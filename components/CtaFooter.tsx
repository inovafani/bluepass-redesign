"use client";

import { useRef } from "react";
import { gsap, useGSAP, reduced } from "@/lib/gsap";
import { footerColumns, sunsetImage } from "@/lib/data";
import ParallaxMedia from "./ui/ParallaxMedia";
import { MaskLines, Rail } from "./ui/Text";
import Button from "./ui/Button";

const SCRIM = 0.6;
const WORDMARK = "Bluepass".split("");

export default function CtaFooter() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || reduced()) return;

      gsap
        .timeline({ scrollTrigger: { trigger: ".cta", start: "top 65%", once: true } })
        .from(".cta__ctas > *", { opacity: 0, y: 26, duration: 1, stagger: 0.1 }, 0.5)
        .from(".cta__note", { opacity: 0, duration: 0.9 }, 0.8);

      /* Footer columns settle in from below, column by column. */
      gsap.from(".footer__col", {
        opacity: 0,
        y: 34,
        duration: 1,
        stagger: 0.08,
        scrollTrigger: { trigger: ".footer__grid", start: "top 88%", once: true },
      });
      gsap.from(".footer__legal", {
        opacity: 0,
        y: 18,
        duration: 0.9,
        scrollTrigger: { trigger: ".footer__legal", start: "top 96%", once: true },
      });

      /* The oversized wordmark: letters rise out of a clip, then the whole
         line keeps scrubbing a little as the page bottoms out — it reads as
         the sign-off rather than as decoration. */
      gsap.from(".wordmark__char", {
        yPercent: 118,
        duration: 1.5,
        ease: "bp-out",
        stagger: 0.055,
        scrollTrigger: { trigger: ".wordmark", start: "top 95%", once: true },
      });
      gsap.fromTo(
        ".wordmark",
        { letterSpacing: "-3px" },
        {
          letterSpacing: "-6px",
          ease: "none",
          scrollTrigger: { trigger: ".wordmark", start: "top bottom", end: "bottom bottom", scrub: 0.8 },
        },
      );
    },
    { scope: ref },
  );

  return (
    <section ref={ref} className="section section--gap">
      {/* -------- closing CTA -------- */}
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
          <MaskLines
            lines={["Book the ocean.", "Leave it better."]}
            className="ds-display-lg"
            stagger={0.13}
          />
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

      {/* -------- footer -------- */}
      <div style={{ borderTop: "1px solid var(--color-hairline-soft)" }}>
        <div className="shell" style={{ maxWidth: 1360, margin: "0 auto", padding: "64px clamp(20px,4.4vw,64px) 40px" }}>
          <div className="footer__grid">
            <div className="footer__col">
              <div className="ds-headline" style={{ color: "#ffffff" }}>
                Bluepass
              </div>
              <div className="ds-body-sm" style={{ color: "var(--color-ink-muted)", marginTop: 10, maxWidth: 220 }}>
                Vetted operators for surf, sail and dive — booked at the price you see.
              </div>
            </div>

            {footerColumns.map((col) => (
              <div key={col.title} className="footer__col" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div className="ds-caption" style={{ color: "#ffffff", textTransform: "uppercase", letterSpacing: 1 }}>
                  {col.title}
                </div>
                {col.links.map((link) => (
                  <a key={link} href="#" className="footer__link ds-body-sm" style={{ color: "var(--color-ink-muted)" }}>
                    {link}
                  </a>
                ))}
              </div>
            ))}
          </div>

          <div style={{ borderTop: "1px solid var(--color-hairline-soft)", margin: "32px 0 28px" }} />

          <div className="footer__legal" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <span className="ds-micro" style={{ color: "var(--color-ink-muted)" }}>
              © 2026 Bluepass
            </span>
            <div style={{ display: "flex", gap: 20 }}>
              <a href="#" className="footer__link ds-micro" style={{ color: "var(--color-ink-muted)" }}>
                Privacy
              </a>
              <a href="#" className="footer__link ds-micro" style={{ color: "var(--color-ink-muted)" }}>
                Terms
              </a>
            </div>
          </div>

          <div className="wordmark" aria-label="Bluepass">
            {WORDMARK.map((ch, i) => (
              <span className="wordmark__mask" key={i}>
                <span className="wordmark__char">{ch}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
