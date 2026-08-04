"use client";

import { useRef, type CSSProperties, type ElementType } from "react";
import { gsap, useGSAP, reduced } from "@/lib/gsap";

/* -------------------------------------------------------------------------
 * MaskLines — display headlines rise out of an overflow clip, one line at a
 * time. This is the site's primary typographic entrance; every h1/h2 uses it.
 * ---------------------------------------------------------------------- */
export function MaskLines({
  lines,
  as: Tag = "h2",
  className = "ds-display-lg",
  style,
  mode = "scroll",
  delay = 0,
  stagger = 0.11,
}: {
  lines: string[];
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  /** "load" fires immediately (hero), "scroll" waits for the block to enter. */
  mode?: "scroll" | "load";
  delay?: number;
  stagger?: number;
}) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const targets = gsap.utils.toArray<HTMLElement>(".line-mask > span", ref.current);
      if (!targets.length) return;

      if (reduced()) return;

      /* `from` rather than a pre-`set` plus `to`: a from-tween renders its
         start state immediately (so there's no flash) *and* ScrollTrigger
         re-resolves it on refresh. The set/to pair could strand the lines
         hidden forever if the trigger's start position was measured before
         images and fonts settled — which is exactly what happened. */
      gsap.from(targets, {
        yPercent: 115,
        opacity: 0,
        duration: 1.35,
        ease: "bp-out",
        stagger,
        delay,
        scrollTrigger:
          mode === "scroll"
            ? { trigger: ref.current, start: "top 88%", once: true }
            : undefined,
      });
    },
    { scope: ref, dependencies: [mode, delay, stagger] },
  );

  return (
    <Tag ref={ref as never} className={className} style={style}>
      {lines.map((line, i) => (
        <span className="line-mask" key={i}>
          <span>{line}</span>
        </span>
      ))}
    </Tag>
  );
}

/* -------------------------------------------------------------------------
 * Words — a softer entrance for supporting copy and eyebrows: words drift up
 * and resolve out of a slight blur, which keeps long paragraphs from reading
 * as a single sliding slab.
 * ---------------------------------------------------------------------- */
export function Words({
  text,
  as: Tag = "p",
  className = "ds-body",
  style,
  delay = 0,
  mode = "scroll",
}: {
  text: string;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  delay?: number;
  mode?: "scroll" | "load";
}) {
  const ref = useRef<HTMLElement>(null);
  const words = text.split(" ");

  useGSAP(
    () => {
      const targets = gsap.utils.toArray<HTMLElement>(".word", ref.current);
      if (!targets.length) return;

      if (reduced()) return;

      gsap.from(targets, {
        y: 22,
        opacity: 0,
        filter: "blur(6px)",
        duration: 1,
        ease: "bp-out",
        stagger: 0.022,
        delay,
        scrollTrigger:
          mode === "scroll"
            ? { trigger: ref.current, start: "top 90%", once: true }
            : undefined,
      });
    },
    { scope: ref, dependencies: [text, mode, delay] },
  );

  return (
    <Tag ref={ref as never} className={className} style={style}>
      {words.map((w, i) => (
        <span className="word" key={i}>
          {w}
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </Tag>
  );
}

/* -------------------------------------------------------------------------
 * Rail — the vertical section label on the right edge. The hairline beneath it
 * draws downward as the block enters, which is what makes the label feel like
 * a measurement mark rather than stray text.
 * ---------------------------------------------------------------------- */
export function Rail({ label, tone = "light" }: { label: string; tone?: "light" | "dark" }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const text = el.querySelector("span");
      const line = el.querySelector<HTMLElement>(".rail__line");

      if (reduced()) {
        gsap.set([text, line], { opacity: 1 });
        gsap.set(line, { height: 72 });
        return;
      }

      gsap
        .timeline({ scrollTrigger: { trigger: el, start: "top 85%", once: true } })
        .fromTo(text, { opacity: 0, y: -18 }, { opacity: 1, y: 0, duration: 0.9 })
        .fromTo(line, { height: 0 }, { height: 72, duration: 0.9, ease: "bp-inOut" }, "-=0.5");
    },
    { scope: ref },
  );

  return (
    <div
      ref={ref}
      className="rail"
      style={{ color: tone === "light" ? "rgba(255,255,255,0.5)" : "var(--color-ink-muted)" }}
    >
      <span
        className="ds-micro"
        style={{ color: "inherit", letterSpacing: 2, textTransform: "uppercase" }}
      >
        {label}
      </span>
      <i
        className="rail__line"
        style={{ display: "block", width: 1, background: "currentColor", opacity: 0.35 }}
      />
    </div>
  );
}
