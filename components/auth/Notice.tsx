"use client";

import { useRef, type ReactNode } from "react";
import { gsap, useGSAP, reduced } from "@/lib/gsap";

export type NoticeTone = "error" | "success" | "info";

/**
 * The inline message strip inside auth forms.
 *
 * Tones lean on existing tokens — success on `--color-semantic-success`, error
 * on the design system's coral, info on a plain hairline — so nothing here
 * introduces a colour the rest of the site doesn't already use.
 */
export default function Notice({ tone = "info", children }: { tone?: NoticeTone; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (reduced()) return;
      gsap.fromTo(
        ref.current,
        { opacity: 0, y: -10, height: 0 },
        { opacity: 1, y: 0, height: "auto", duration: 0.5, ease: "bp-out" },
      );
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={`anotice anotice--${tone}`} role={tone === "error" ? "alert" : "status"}>
      <span className="anotice__glyph" aria-hidden>
        {tone === "success" ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        ) : tone === "error" ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 8v5M12 16.5v.5" />
            <circle cx="12" cy="12" r="9" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 11v5M12 7.5v.5" />
            <circle cx="12" cy="12" r="9" />
          </svg>
        )}
      </span>
      <span className="ds-body-sm anotice__text">{children}</span>
    </div>
  );
}
