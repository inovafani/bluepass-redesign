"use client";

import { useRef, useState } from "react";
import { gsap, useGSAP, reduced } from "@/lib/gsap";
import KaiPanel from "./KaiPanel";

/** The floating "Ask Kai" pill — `showFloatingChat` in the design, default on. */
export default function KaiChat() {
  const ref = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      if (reduced()) {
        gsap.set(el, { opacity: 1, y: 0, scale: 1 });
        return;
      }

      gsap.fromTo(
        el,
        { opacity: 0, y: 40, scale: 0.85 },
        { opacity: 1, y: 0, scale: 1, duration: 1, ease: "back.out(1.7)", delay: 2.2 },
      );

      // The presence dot keeps a slow pulse so the widget reads as live.
      gsap.to(".kai__dot", {
        boxShadow: "0 0 0 6px rgba(34,197,94,0)",
        duration: 1.8,
        ease: "power2.out",
        repeat: -1,
        repeatDelay: 0.6,
        delay: 3,
      });

      const enter = () => {
        gsap.to(el, { scale: 1.04, duration: 0.4, ease: "power3.out", overwrite: "auto" });
        gsap.to(".kai__avatar", { rotate: -8, duration: 0.5, ease: "back.out(3)", overwrite: "auto" });
      };
      const leave = () => {
        gsap.to(el, { scale: 1, duration: 0.5, ease: "power3.out", overwrite: "auto" });
        gsap.to(".kai__avatar", { rotate: 0, duration: 0.5, ease: "power3.out", overwrite: "auto" });
      };
      el.addEventListener("pointerenter", enter);
      el.addEventListener("pointerleave", leave);
      return () => {
        el.removeEventListener("pointerenter", enter);
        el.removeEventListener("pointerleave", leave);
      };
    },
    { scope: ref },
  );

  return (
    <>
      {/* The pill steps aside while the panel is up — on desktop the panel sits
          in the same corner, and two things fighting for it reads as a bug. */}
      <button
        ref={ref}
        type="button"
        className={`kai ${open ? "is-hidden" : ""}`}
        style={{ opacity: 0 }}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span className="kai__avatar">
        K
        <span className="kai__dot" />
      </span>
        <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.2, textAlign: "left" }}>
          <span className="ds-body-sm" style={{ color: "var(--color-ink)" }}>
            Ask Kai
          </span>
          <span className="ds-micro" style={{ color: "var(--color-ink-muted)" }}>
            Chat on bluepass.co
          </span>
        </span>
      </button>

      <KaiPanel open={open} onClose={() => setOpen(false)} />
    </>
  );
}
