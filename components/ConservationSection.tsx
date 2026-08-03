"use client";

import { useRef } from "react";
import { gsap, useGSAP, reduced } from "@/lib/gsap";
import { threeWays, volcanoImage } from "@/lib/data";
import ParallaxMedia from "./ui/ParallaxMedia";
import { MaskLines, Words, Rail } from "./ui/Text";

const money = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

export default function ConservationSection() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || reduced()) return;

      /* ---- the example-fare card ------------------------------------- */
      const fare = el.querySelector(".fare");
      gsap
        .timeline({ scrollTrigger: { trigger: fare, start: "top 82%", once: true } })
        .from(fare, { opacity: 0, y: 60, duration: 1.2 })
        .from(".fare__chip", { scale: 0.7, opacity: 0, duration: 0.7, ease: "back.out(2.2)" }, "-=0.5")
        .from(".fare__row", { opacity: 0, x: -18, duration: 0.7, stagger: 0.1 }, "-=0.45")
        .from(".fare__note", { opacity: 0, duration: 0.7 }, "-=0.3");

      /* Both figures count up. The give-back number is deliberately slower so
         it lands last — it's the number the section is actually about. */
      el.querySelectorAll<HTMLElement>("[data-count]").forEach((node, i) => {
        const target = Number(node.dataset.count);
        const obj = { v: 0 };
        gsap.to(obj, {
          v: target,
          duration: 1.6 + i * 0.5,
          ease: "bp-out",
          delay: 0.35,
          onUpdate: () => {
            node.textContent = money(obj.v);
          },
          scrollTrigger: { trigger: fare, start: "top 82%", once: true },
        });
      });

      /* ---- the three ways -------------------------------------------- */
      const rows = gsap.utils.toArray<HTMLElement>(".way", el);
      rows.forEach((row, i) => {
        const path = row.querySelector<SVGPathElement>("path");
        const tl = gsap.timeline({
          scrollTrigger: { trigger: row, start: "top 88%", once: true },
        });
        tl.from(row, { opacity: 0, x: 40, duration: 1.1 })
          .fromTo(
            row,
            { "--rule": "0%" } as gsap.TweenVars,
            { "--rule": "100%", duration: 1, ease: "bp-inOut" } as gsap.TweenVars,
            "-=0.7",
          );
        if (path) {
          const len = path.getTotalLength();
          tl.fromTo(
            path,
            { strokeDasharray: len, strokeDashoffset: len },
            { strokeDashoffset: 0, duration: 1.4, ease: "bp-inOut" },
            0.2 + i * 0.05,
          );
        }
      });

      /* Hover walks the icon ring and title forward a touch. */
      rows.forEach((row) => {
        const ring = row.querySelector(".way__ring");
        row.addEventListener("pointerenter", () => {
          gsap.to(ring, { borderColor: "rgba(255,255,255,0.55)", scale: 1.08, duration: 0.45, overwrite: "auto" });
          gsap.to(row.querySelector(".way__title"), { x: 6, duration: 0.45, overwrite: "auto" });
        });
        row.addEventListener("pointerleave", () => {
          gsap.to(ring, { borderColor: "var(--color-hairline)", scale: 1, duration: 0.5, overwrite: "auto" });
          gsap.to(row.querySelector(".way__title"), { x: 0, duration: 0.5, overwrite: "auto" });
        });
      });
    },
    { scope: ref },
  );

  return (
    <section ref={ref} className="section section--gap">
      <ParallaxMedia src={volcanoImage} alt="" strength={16} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg,rgba(10,10,9,0.55) 0%,rgba(10,10,9,0.88) 100%)",
        }}
      />

      <div
        className="shell pad-y"
        style={{ position: "relative", zIndex: 2, maxWidth: 1360, margin: "0 auto" }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <Words
            as="span"
            className="ds-caption"
            text="Built in — never an add-on"
            style={{ color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: 3 }}
          />
          <MaskLines
            lines={["Every trip leaves it better."]}
            className="ds-display-lg"
            style={{ textAlign: "center", marginTop: 16, maxWidth: 760 }}
          />
          <Words
            className="ds-body"
            text="A fixed 5% of every fare goes to work in the waters you travel — protecting reefs, cleaning the ocean, and lifting the communities who live by it. Part of the price you see, never an add-on. Most platforms route nothing."
            style={{
              color: "rgba(255,255,255,0.65)",
              textAlign: "center",
              marginTop: 14,
              maxWidth: 620,
            }}
          />
          <Words
            as="span"
            className="ds-caption"
            text="Three ways, every trip"
            style={{
              color: "rgba(255,255,255,0.45)",
              textTransform: "uppercase",
              letterSpacing: 3,
              marginTop: 40,
            }}
          />
        </div>

        <div className="give__layout">
          <div
            className="fare"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid var(--color-hairline-soft)",
              borderRadius: "var(--radius-xl)",
              padding: 24,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span
                className="ds-micro"
                style={{ color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 1 }}
              >
                Example fare
              </span>
              <span
                className="fare__chip"
                style={{
                  padding: "4px 10px",
                  background: "rgba(34,197,94,0.15)",
                  borderRadius: "var(--radius-pill)",
                  color: "var(--color-semantic-success)",
                  fontSize: "var(--type-micro-size)",
                  fontWeight: 600,
                  letterSpacing: 0.5,
                }}
              >
                5% BUILT IN
              </span>
            </div>

            <div className="ds-headline" style={{ color: "#ffffff", marginTop: 16 }}>
              Komodo liveaboard · 5 nights
            </div>
            <div style={{ borderTop: "1px solid var(--color-hairline-soft)", margin: "18px 0" }} />

            <div className="fare__row" style={{ display: "flex", justifyContent: "space-between" }}>
              <span className="ds-body" style={{ color: "rgba(255,255,255,0.6)" }}>
                Your fare
              </span>
              <span className="ds-body" style={{ color: "#ffffff" }} data-count="3450">
                $3,450
              </span>
            </div>
            <div className="fare__row" style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
              <span className="ds-body" style={{ color: "rgba(255,255,255,0.6)" }}>
                Gives back (5%)
              </span>
              <span className="ds-body" style={{ color: "var(--color-semantic-success)" }} data-count="172">
                $172
              </span>
            </div>
            <div className="fare__note ds-micro" style={{ color: "rgba(255,255,255,0.45)", marginTop: 14 }}>
              → reefs · clean-ups · communities
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {threeWays.map((way) => (
              <div
                key={way.title}
                className="way"
                style={{
                  display: "flex",
                  gap: 16,
                  alignItems: "flex-start",
                  padding: "20px 0",
                  position: "relative",
                }}
              >
                <span
                  className="way__ring"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    border: "1px solid var(--color-hairline)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flex: "none",
                  }}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={way.iconD} />
                  </svg>
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                    <span className="way__title ds-headline" style={{ color: "#ffffff" }}>
                      {way.title}
                    </span>
                    <span
                      className="ds-caption"
                      style={{ color: "rgba(255,255,255,0.45)", textTransform: "uppercase", whiteSpace: "nowrap" }}
                    >
                      {way.tag}
                    </span>
                  </div>
                  <div className="ds-body-sm" style={{ color: "rgba(255,255,255,0.6)", marginTop: 6 }}>
                    {way.desc}
                  </div>
                </div>
              </div>
            ))}

            <a href="#" className="link-arrow ds-body-sm" style={{ marginTop: 20, display: "inline-flex", alignSelf: "flex-start" }}>
              <span>See exactly where it goes</span>
              <i aria-hidden>→</i>
            </a>
          </div>
        </div>
      </div>

      <Rail label="Conservation" />
    </section>
  );
}
