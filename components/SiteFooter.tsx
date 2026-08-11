"use client";

import Link from "next/link";
import { useRef } from "react";
import { gsap, useGSAP, reduced } from "@/lib/gsap";
import { footerColumns } from "@/lib/data";

const WORDMARK = "Bluepass".split("");

/** Shared across routes — the oversized wordmark is the site's sign-off. */
export default function SiteFooter() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (reduced()) return;

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

      /* Letters rise out of a clip, then the line keeps scrubbing a little as
         the page bottoms out — it reads as the sign-off, not decoration. */
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
    <footer ref={ref} style={{ borderTop: "1px solid var(--color-hairline-soft)", background: "var(--color-canvas)" }}>
      <div className="shell" style={{ maxWidth: 1360, margin: "0 auto", padding: "64px clamp(20px,4.4vw,64px) 40px" }}>
        <div className="footer__grid">
          <div className="footer__col">
            <div className="ds-headline" style={{ color: "#ffffff" }}>
              Bluepass
            </div>
            <div className="ds-body-sm" style={{ color: "var(--color-ink-muted)", marginTop: 10, maxWidth: 220 }}>
              Vetted operators for surf, sail and dive, booked at the price you see.
            </div>
          </div>

          {footerColumns.map((col) => (
            <div key={col.title} className="footer__col" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div className="ds-caption" style={{ color: "#ffffff", textTransform: "uppercase", letterSpacing: 1 }}>
                {col.title}
              </div>
              {col.links.map((link) => (
                <Link key={link} href="#" className="footer__link ds-body-sm">
                  {link}
                </Link>
              ))}
            </div>
          ))}
        </div>

        <div style={{ borderTop: "1px solid var(--color-hairline-soft)", margin: "32px 0 28px" }} />

        <div
          className="footer__legal"
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}
        >
          <span className="ds-micro" style={{ color: "var(--color-ink-muted)" }}>
            © 2026 Bluepass
          </span>
          <div style={{ display: "flex", gap: 20 }}>
            <Link href="#" className="footer__link ds-micro">
              Privacy
            </Link>
            <Link href="#" className="footer__link ds-micro">
              Terms
            </Link>
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
    </footer>
  );
}
