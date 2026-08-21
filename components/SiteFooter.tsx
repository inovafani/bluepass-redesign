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
                <Link key={link.label} href={link.href} className="footer__link ds-body-sm">
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
        </div>

        {/* Payment mark and support line (2026-08-21, Tony's UX audit §9 - "no payment security
            marks, no support number"). Both are real rather than invented: Stripe genuinely
            processes every checkout (see Kai's bluepass-pms-checkout-client.ts), and Kai chat -
            already the floating pill on every page - is genuinely the only support channel this
            business runs, so naming it here is a discoverability fix, not a new promise. An ABN
            or registered company name would go here too, but neither exists yet - both /terms and
            /privacy already flag that honestly as "Draft - pending review" rather than guess. */}
        <div
          className="footer__trust"
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}
        >
          <span className="ds-micro footer__trust-item" style={{ color: "var(--color-ink-muted)" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="10" width="16" height="10" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
            Payments secured by Stripe
          </span>
          <button
            type="button"
            className="ds-micro footer__link footer__trust-item"
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
            onClick={() => window.dispatchEvent(new CustomEvent("kai:open", { detail: {} }))}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 5h16v11H8l-4 4z" />
            </svg>
            Need help? Ask Kai
          </button>
        </div>

        <div style={{ borderTop: "1px solid var(--color-hairline-soft)", margin: "20px 0 28px" }} />

        <div
          className="footer__legal"
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}
        >
          <span className="ds-micro" style={{ color: "var(--color-ink-muted)" }}>
            © 2026 Bluepass
          </span>
          <div style={{ display: "flex", gap: 20 }}>
            <Link href="/privacy" className="footer__link ds-micro">
              Privacy
            </Link>
            <Link href="/terms" className="footer__link ds-micro">
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
