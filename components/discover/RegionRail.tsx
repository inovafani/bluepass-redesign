"use client";

import Image from "next/image";
import { useRef } from "react";
import { gsap, useGSAP, reduced } from "@/lib/gsap";
import { regions } from "@/lib/discover";
import { useDiscover } from "./DiscoverState";

/**
 * The region strip. Drag-to-pan with a progress rule underneath rather than a
 * native scrollbar — it reads as part of the layout instead of chrome.
 *
 * Each card is a toggle on the results below. When one is picked the rail dims
 * the rest, so the strip doubles as the readout of what is filtered — there is
 * no separate "you are here" chrome to keep in sync.
 */
export default function RegionRail() {
  const ref = useRef<HTMLDivElement>(null);
  const { region, pickRegion } = useDiscover();
  /* A drag across the strip must not land as a click on a card. */
  const draggedRef = useRef(false);

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
        draggedRef.current = false;
        startX = e.clientX;
        startScroll = track.scrollLeft;
        track.classList.add("is-dragging");
      };
      const onMove = (e: PointerEvent) => {
        if (!down) return;
        const dx = e.clientX - startX;
        if (Math.abs(dx) > 6) draggedRef.current = true;
        track.scrollLeft = startScroll - dx;
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

  /* The selected card gets a ring that draws itself rather than snapping on. */
  useGSAP(
    () => {
      if (reduced()) return;
      const active = ref.current?.querySelector(".rregion.is-active");
      if (!active) return;
      gsap.fromTo(
        active.querySelector(".rregion__ring"),
        { opacity: 0, scale: 1.04 },
        { opacity: 1, scale: 1, duration: 0.7, ease: "bp-out" },
      );
    },
    { scope: ref, dependencies: [region] },
  );

  const anyActive = regions.some((r) => r.name === region);

  return (
    <div ref={ref} className={`rrail shell ${anyActive ? "has-active" : ""}`}>
      <div className="rrail__track" role="group" aria-label="Filter trips by region">
        {regions.map((r) => {
          const active = r.name === region;
          return (
            <button
              key={r.slug}
              type="button"
              className={`rregion ${active ? "is-active" : ""}`}
              aria-pressed={active}
              onClick={() => {
                if (draggedRef.current) return;
                pickRegion(r.name);
              }}
            >
              <span className="rregion__frame">
                <span className="rregion__img">
                  <Image src={r.img} alt="" fill sizes="260px" style={{ objectFit: "cover" }} />
                </span>
                <span className="rregion__scrim" />
                <span className="rregion__ring" aria-hidden />
                <span className="rregion__tick" aria-hidden>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </span>
              </span>
              <span className="rregion__meta">
                <span className="ds-body-sm rregion__name">{r.name}</span>
                {/* No trip count here - see lib/discover.ts's Region type. A per-region count this
                    low reads as an inventory-poverty signal (P0-4, Tony's 2026-08-12 UX audit); the
                    active state still needs its own feedback, so "Showing" stays. */}
                {active ? <span className="ds-micro rregion__count">Showing</span> : null}
              </span>
            </button>
          );
        })}
      </div>
      <div className="rrail__bar" aria-hidden>
        <span className="rrail__thumb" />
      </div>
    </div>
  );
}
