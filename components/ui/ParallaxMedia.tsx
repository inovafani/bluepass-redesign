"use client";

import Image from "next/image";
import { useRef } from "react";
import { gsap, useGSAP, reduced } from "@/lib/gsap";

/**
 * Full-bleed section photography. The frame is oversized and scrubbed against
 * scroll so the image drifts slower than the block it sits in — the depth cue
 * that makes each dark section feel like a window rather than a panel.
 *
 * `intro` adds a one-shot scale-down on first paint, used by the hero.
 */
export default function ParallaxMedia({
  src,
  alt,
  strength = 14,
  intro = false,
  priority = false,
  scrim,
}: {
  src: string;
  alt: string;
  /** How far the image travels, as a % of its own height. */
  strength?: number;
  intro?: boolean;
  priority?: boolean;
  /** CSS background for the darkening layer stacked over the photo. */
  scrim?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const frame = el.querySelector(".media__frame");
      if (reduced()) {
        gsap.set(frame, { scale: 1, yPercent: 0 });
        return;
      }

      if (intro) {
        gsap.fromTo(
          frame,
          { scale: 1.22 },
          { scale: 1.06, duration: 2.2, ease: "bp-out", delay: 0.05 },
        );
      }

      gsap.fromTo(
        frame,
        { yPercent: -strength / 2 },
        {
          yPercent: strength / 2,
          ease: "none",
          scrollTrigger: {
            trigger: el,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        },
      );
    },
    { scope: ref, dependencies: [strength, intro] },
  );

  return (
    <div ref={ref} className="media" aria-hidden={alt === ""}>
      <div
        className="media__frame"
        style={{ position: "absolute", inset: "-12% 0", willChange: "transform" }}
      >
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          /* "100vw" alone only accounts for viewport WIDTH - but every section this fills is
             cropped with object-fit: cover, and on mobile these sections run much taller
             (relative to their width) than the source photos' own landscape aspect ratio. The
             browser was picking a source image sized for a ~375px-wide box, then stretching it
             to cover a ~1000-1600px-tall one - visible pixelation on every hero on a phone
             (2026-08-21, reported directly: "background image hero section... pecah"). The
             extra width below is a deliberate over-fetch, not a precise one - there's no fixed
             ratio that's exactly right for every section this component fills (some are a full
             viewport-height hero, others run taller still with stacked content), so this trades
             a larger mobile download for headroom against the tallest real cases rather than
             chasing an exact number. */
          sizes="(max-width: 900px) 180vw, 100vw"
          style={{ objectFit: "cover" }}
        />
      </div>
      {scrim ? <div style={{ position: "absolute", inset: 0, background: scrim }} /> : null}
    </div>
  );
}
