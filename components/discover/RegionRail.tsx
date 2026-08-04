"use client";

import Image from "next/image";
import { useRef } from "react";
import { gsap, useGSAP, reduced } from "@/lib/gsap";
import { regions } from "@/lib/discover";

/**
 * The region strip. Drag-to-pan with a progress rule underneath rather than a
 * native scrollbar — it reads as part of the layout instead of chrome.
 */
export default function RegionRail() {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const track = el.querySelector<HTMLElement>(".rrail__track");
      const thumb = el.querySelector<HTMLElement>(".rrail__thumb");
      if (!track || !thumb) return;

      const sync = () => {
        const max = track.scrollWidth - track.clientWidth;
        const ratio = track.clientWidth / track.scrollWidth;
        gsap.set(thumb, { width: `${Math.min(100, ratio * 100)}%` });
        gsap.set(thumb, { xPercent: max > 0 ? (track.scrollLeft / max) * (100 / ratio - 100) : 0 });
      };
      sync();
      track.addEventListener("scroll", sync, { passive: true });
      window.addEventListener("resize", sync);

      /* Pointer drag to pan — the strip is wider than any viewport. */
      let down = false;
      let startX = 0;
      let startScroll = 0;
      const onDown = (e: PointerEvent) => {
        down = true;
        startX = e.clientX;
        startScroll = track.scrollLeft;
        track.classList.add("is-dragging");
      };
      const onMove = (e: PointerEvent) => {
        if (!down) return;
        track.scrollLeft = startScroll - (e.clientX - startX);
      };
      const onUp = () => {
        down = false;
        track.classList.remove("is-dragging");
      };
      track.addEventListener("pointerdown", onDown);
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);

      if (!reduced()) {
        gsap.from(".rregion", {
          opacity: 0,
          y: 40,
          duration: 1,
          stagger: 0.07,
          ease: "bp-out",
          scrollTrigger: { trigger: el, start: "top 92%", once: true },
        });

        gsap.utils.toArray<HTMLElement>(".rregion", el).forEach((card) => {
          const img = card.querySelector(".rregion__img");
          card.addEventListener("pointerenter", () =>
            gsap.to(img, { scale: 1.09, duration: 0.9, ease: "power3.out", overwrite: "auto" }),
          );
          card.addEventListener("pointerleave", () =>
            gsap.to(img, { scale: 1, duration: 0.9, ease: "power3.out", overwrite: "auto" }),
          );
        });
      }

      return () => {
        track.removeEventListener("scroll", sync);
        window.removeEventListener("resize", sync);
        track.removeEventListener("pointerdown", onDown);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className="rrail shell">
      <div className="rrail__track">
        {regions.map((r) => (
          <button key={r.slug} type="button" className="rregion">
            <span className="rregion__frame">
              <span className="rregion__img">
                <Image src={r.img} alt="" fill sizes="260px" style={{ objectFit: "cover" }} />
              </span>
              <span className="rregion__scrim" />
            </span>
            <span className="rregion__meta">
              <span className="ds-body-sm rregion__name">{r.name}</span>
              <span className="ds-micro rregion__count">
                {r.trips} {r.trips === 1 ? "trip" : "trips"}
              </span>
            </span>
          </button>
        ))}
      </div>
      <div className="rrail__bar" aria-hidden>
        <span className="rrail__thumb" />
      </div>
    </div>
  );
}
