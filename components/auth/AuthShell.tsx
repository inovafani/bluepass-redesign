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

      /* The eyebrow is a child of .ashell__form, so the stagger below already
         animates it. Giving it a second .from() left both tweens fighting over
         the same property and the text settled at opacity 0 — invisible. */
      gsap
        .timeline({ delay: 0.25 })
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
            <Image src="/bluepass-logo-transparent.png" alt="" width={34} height={34} priority />
          </span>
          <span className="ds-headline ashell__brand-text">Bluepass</span>
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
          {/* The brand mark greets the visitor before the fields do — the form
              should feel like stepping into Bluepass, not filling in a utility. */}
          <span className="ashell__badge" aria-hidden>
            <Image
              src="/bluepass-logo-full.png"
              alt=""
              width={112}
              height={112}
              priority
              sizes="112px"
            />
          </span>
          <span className="ashell__eyebrow ds-body-lg">{eyebrow}</span>
          {children}
        </div>
        {footer ? <div className="ashell__footer ds-body-sm">{footer}</div> : null}
      </main>
    </div>
  );
}
