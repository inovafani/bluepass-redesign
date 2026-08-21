"use client";

import { useRef } from "react";
import { gsap, useGSAP, reduced } from "@/lib/gsap";

/**
 * The thin strip between the hero and the grid (Tony's 2026-08-12 UX audit, §4.2). Says the
 * three trust claims once, in one place, instead of letting the hero and every trip card each
 * repeat their own version - see DiscoverHero's copy and TripGrid's "card diet" for the other
 * two sides of the same fix.
 */
const items = [
  {
    label: "No markup, ever",
    iconD: "M20 12l-8 8-9-9V4h7zM7 7a1 1 0 1 0 0.01 0",
  },
  {
    label: "Vetted operators only",
    iconD: "M12 3l7 3v6c0 5-3 8-7 9-4-1-7-4-7-9V6z M9 12l2 2 4-4",
  },
  {
    label: "5% to conservation",
    iconD: "M3 14c2-2.5 4-2.5 6 0s4 2.5 6 0 4-2.5 6 0 M12 4c2 2.5 2 5 0 7-2-2-2-4.5 0-7z",
  },
];

export default function TrustBanner() {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || reduced()) return;
      gsap.from(el.querySelectorAll(".tbanner__item"), {
        opacity: 0,
        y: 10,
        duration: 0.7,
        stagger: 0.08,
        ease: "bp-out",
        scrollTrigger: { trigger: el, start: "top 92%", once: true },
      });
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className="tbanner shell">
      <ul className="tbanner__row">
        {items.map((item) => (
          <li key={item.label} className="tbanner__item">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d={item.iconD} />
            </svg>
            <span className="ds-body-sm">{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
