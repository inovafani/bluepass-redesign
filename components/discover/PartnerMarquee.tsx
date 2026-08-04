"use client";

import { useRef } from "react";
import { gsap, useGSAP, reduced } from "@/lib/gsap";
import { partners } from "@/lib/discover";
import { Words } from "../ui/Text";

/**
 * Operator + impact partner names. The list outgrows any viewport, so instead
 * of clipping it, it drifts — one seamless loop, paused on hover so names stay
 * readable.
 */
export default function PartnerMarquee() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || reduced()) return;
      const track = el.querySelector<HTMLElement>(".pmarquee__track");
      if (!track) return;

      // The list is rendered twice; travelling exactly half the width and
      // wrapping puts the copy back where the original started.
      const loop = gsap.to(track, {
        xPercent: -50,
        duration: 42,
        ease: "none",
        repeat: -1,
      });

      const slow = () => gsap.to(loop, { timeScale: 0.15, duration: 0.6, overwrite: true });
      const resume = () => gsap.to(loop, { timeScale: 1, duration: 0.8, overwrite: true });
      el.addEventListener("pointerenter", slow);
      el.addEventListener("pointerleave", resume);

      gsap.from(el, {
        opacity: 0,
        y: 30,
        duration: 1,
        scrollTrigger: { trigger: el, start: "top 92%", once: true },
      });

      return () => {
        el.removeEventListener("pointerenter", slow);
        el.removeEventListener("pointerleave", resume);
      };
    },
    { scope: ref },
  );

  return (
    <section ref={ref} className="pmarquee">
      <Words
        as="span"
        className="ds-caption pmarquee__label"
        text="Vetted operators & impact partners"
        style={{ color: "var(--color-ink-muted)", textTransform: "uppercase", letterSpacing: 3 }}
      />

      <div className="pmarquee__viewport">
        <div className="pmarquee__track">
          {[...partners, ...partners].map((p, i) => (
            <span className="pchip ds-body-sm" key={p + i} aria-hidden={i >= partners.length}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3l7 3v6c0 5-3 8-7 9-4-1-7-4-7-9V6z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
              {p}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
