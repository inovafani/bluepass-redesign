"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { gsap, useGSAP, reduced } from "@/lib/gsap";
import { lockScroll, unlockScroll } from "@/lib/lenis";
import { reels } from "@/lib/data";

const N = reels.length;
const mod = (i: number) => ((i % N) + N) % N;

/**
 * Slot-based reel carousel — the home page's, lifted out so the Partners page
 * runs the identical rig rather than a lookalike.
 *
 * Every card stays mounted; its slot relative to the active index drives one
 * tween of x / scale / opacity / blur, so the DOM never re-orders mid-flight.
 */
export default function ReelCarousel() {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const paused = useRef(false);

  useEffect(() => setMounted(true), []);

  /* The card is already centred once, so a second click means "play it" rather than "bring it to
     centre again" - one click always does the thing that click hadn't already done. */
  const onCardClick = (i: number) => {
    if (i === index) setPlayingIndex(i);
    else setIndex(i);
  };

  const closeLightbox = useCallback(() => setPlayingIndex(null), []);

  useEffect(() => {
    if (playingIndex === null) return;
    lockScroll();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      unlockScroll();
      window.removeEventListener("keydown", onKey);
    };
  }, [playingIndex, closeLightbox]);

  const layout = useCallback((active: number, instant = false) => {
    const track = ref.current?.querySelector(".reels__track");
    if (!track) return;

    // Cards keep one fixed width; the size difference between the centre card
    // and its neighbours is carried entirely by scale, so nothing reflows.
    const wide = window.innerWidth > 860;
    const cardW = wide ? 300 : 260;
    const sideScale = 0.85;

    // Slot pitch has to clear half the centre card plus half a scaled-down
    // neighbour plus the gutter, or the cards overlap instead of sitting apart.
    const gutter = wide ? 26 : 14;
    const step = cardW / 2 + gutter + (cardW * sideScale) / 2;

    Array.from(track.children).forEach((node, i) => {
      let slot = i - active;
      if (slot > N / 2) slot -= N;
      if (slot < -N / 2) slot += N;

      const isCenter = slot === 0;
      const visible = Math.abs(slot) <= 1;

      gsap.to(node, {
        x: slot * step,
        scale: isCenter ? 1 : sideScale,
        opacity: visible ? (isCenter ? 1 : 0.55) : 0,
        zIndex: isCenter ? 3 : 2 - Math.abs(slot),
        filter: isCenter ? "blur(0px)" : "blur(1px)",
        duration: instant || reduced() ? 0 : 0.85,
        ease: "bp-inOut",
        overwrite: "auto",
        pointerEvents: visible ? "auto" : "none",
      });
    });
  }, []);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      layout(index, true);
      if (reduced()) return;

      gsap.from(".reels__stage", {
        opacity: 0,
        y: 70,
        duration: 1.3,
        scrollTrigger: { trigger: ".reels__stage", start: "top 85%", once: true },
      });
      gsap.from(".reels__arrow", {
        opacity: 0,
        scale: 0.6,
        duration: 0.8,
        stagger: 0.1,
        ease: "back.out(2)",
        scrollTrigger: { trigger: ".reels__stage", start: "top 85%", once: true },
      });

      /* Play buttons breathe, just enough to read as video. */
      gsap.to(".reel__play", {
        scale: 1.08,
        duration: 1.6,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        stagger: 0.2,
      });
    },
    { scope: ref },
  );

  useEffect(() => {
    layout(index);
  }, [index, layout]);

  useEffect(() => {
    const onResize = () => layout(index, true);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [index, layout]);

  /* autoplay, paused while the pointer is over the rig or a video is open */
  useEffect(() => {
    if (reduced()) return;
    const id = window.setInterval(() => {
      if (!paused.current && playingIndex === null) setIndex((i) => mod(i + 1));
    }, 5200);
    return () => window.clearInterval(id);
  }, [playingIndex]);

  /* drag / swipe */
  useEffect(() => {
    const stage = ref.current?.querySelector<HTMLElement>(".reels__stage");
    if (!stage) return;
    let startX = 0;
    let down = false;

    const onDown = (e: PointerEvent) => {
      down = true;
      startX = e.clientX;
    };
    const onUp = (e: PointerEvent) => {
      if (!down) return;
      down = false;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 50) setIndex((i) => mod(i + (dx < 0 ? 1 : -1)));
    };

    stage.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    return () => {
      stage.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  return (
    <div ref={ref}>
      <div
        className="reels__stage"
        onPointerEnter={() => (paused.current = true)}
        onPointerLeave={() => (paused.current = false)}
      >
        <button type="button" aria-label="Previous" className="reels__arrow" onClick={() => setIndex((i) => mod(i - 1))}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>

        <div className="reels__viewport">
          <div className="reels__track">
            {reels.map((card, i) => (
              <button
                key={card.img + i}
                type="button"
                className="reel"
                onClick={() => onCardClick(i)}
                aria-label={
                  i === index ? `Play ${card.name}: ${card.caption}` : `${card.name}: ${card.caption}`
                }
              >
                <Image src={card.imgSrc} alt="" fill sizes="300px" style={{ objectFit: "cover" }} />

                <span className="reel__handle">
                  <i />
                  <span className="ds-micro" style={{ color: "#ffffff" }}>
                    {card.handle}
                  </span>
                </span>

                <span className="reel__play">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#0a0a09">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>

                <span className="reel__scrim" />

                <span className="reel__meta">
                  <span className="ds-micro" style={{ color: "rgba(255,255,255,0.5)" }}>
                    {card.num}
                  </span>
                  <span className="ds-body-sm" style={{ color: "#ffffff", fontWeight: 700, marginTop: 4, display: "block" }}>
                    {card.name}
                  </span>
                  <span className="ds-micro" style={{ color: "rgba(255,255,255,0.6)", marginTop: 2, display: "block" }}>
                    {card.caption}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <button type="button" aria-label="Next" className="reels__arrow" onClick={() => setIndex((i) => mod(i + 1))}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 28 }}>
        {reels.map((r, i) => (
          <button
            key={r.img + "dot" + i}
            type="button"
            aria-label={`Go to reel ${i + 1}`}
            onClick={() => setIndex(i)}
            className="reels__dot"
            style={{
              width: i === index ? 26 : 8,
              background: i === index ? "var(--color-ink)" : "var(--color-hairline)",
            }}
          />
        ))}
      </div>

      {mounted && playingIndex !== null
        ? createPortal(
            <div className="reel-lightbox" role="dialog" aria-modal="true" aria-label={reels[playingIndex].name}>
              <button
                type="button"
                className="reel-lightbox__backdrop"
                aria-label="Close video"
                onClick={closeLightbox}
              />
              <div className="reel-lightbox__frame">
                <button type="button" className="reel-lightbox__close" aria-label="Close video" onClick={closeLightbox}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M5 5l14 14M19 5L5 19" />
                  </svg>
                </button>
                {/* Instagram's own embed page - a real player, not the raw .mp4: Instagram stopped
                    exposing that URL to logged-out requests, so this is the one option that both
                    plays and stays within Instagram's own terms for showing someone else's reel. */}
                <iframe
                  src={reels[playingIndex].embedUrl}
                  title={`${reels[playingIndex].name} on Instagram`}
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                  className="reel-lightbox__iframe"
                />
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
