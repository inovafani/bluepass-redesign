"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, type ReactNode } from "react";
import { gsap, useGSAP, reduced } from "@/lib/gsap";
import { MaskLines, Rail } from "../ui/Text";

/**
 * The frame every auth page sits in.
 *
 * A split poster: photography holds the left with the site's own scrim and
 * `Rail` label, the form takes the right on plain canvas. That keeps sign-in
 * inside the same visual argument as the marketing pages instead of dropping
 * the visitor onto a bare utility screen — which is what makes it feel like
 * Bluepass rather than a form.
 *
 * Under 900px the photo becomes a short banner so the form stays above the
 * fold; the headline moves onto the canvas where it still has room to breathe.
 */
export default function AuthShell({
  eyebrow,
  headline,
  support,
  image,
  imageAlt,
  rail,
  children,
  footer,
}: {
  eyebrow: string;
  headline: string[];
  support: string;
  image: string;
  imageAlt: string;
  rail: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || reduced()) return;

      gsap.fromTo(
        el.querySelector(".ashell__photo"),
        { scale: 1.14 },
        { scale: 1, duration: 2.1, ease: "bp-out" },
      );

      gsap
        .timeline({ delay: 0.25 })
        .from(".ashell__eyebrow", { opacity: 0, y: 16, duration: 0.8 }, 0)
        .from(".ashell__support", { opacity: 0, y: 18, duration: 0.9 }, 0.55)
        .from(
          ".ashell__form > *",
          { opacity: 0, y: 22, duration: 0.85, stagger: 0.07 },
          0.4,
        );
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className="ashell">
      <aside className="ashell__aside">
        <span className="ashell__photo">
          <Image src={image} alt={imageAlt} fill priority sizes="(max-width: 900px) 100vw, 50vw" style={{ objectFit: "cover" }} />
        </span>
        <span className="ashell__scrim" />

        <Link href="/" className="ashell__brand">
          <span className="ashell__mark" aria-hidden>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M3 15c2-3 4-3 6 0s4 3 6 0 4-3 6 0" />
              <path d="M12 3c2.5 3.5 2.5 7 0 10-2.5-3-2.5-6.5 0-10z" />
            </svg>
          </span>
          <span className="ds-body-sm ashell__brand-text">Bluepass</span>
        </Link>

        <div className="ashell__aside-copy">
          <MaskLines
            as="h1"
            lines={headline}
            className="ds-display-lg ashell__headline"
            mode="load"
            delay={0.45}
            stagger={0.12}
          />
          <p className="ds-body-lg ashell__support">{support}</p>
        </div>

        <Rail label={rail} />
      </aside>

      <main className="ashell__main">
        <div className="ashell__form">
          <span className="ashell__eyebrow ds-caption">{eyebrow}</span>
          {children}
        </div>
        {footer ? <div className="ashell__footer ds-body-sm">{footer}</div> : null}
      </main>
    </div>
  );
}
