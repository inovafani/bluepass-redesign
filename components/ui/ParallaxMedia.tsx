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
          sizes="100vw"
          style={{ objectFit: "cover" }}
        />
      </div>
      {scrim ? <div style={{ position: "absolute", inset: 0, background: scrim }} /> : null}
    </div>
  );
}
