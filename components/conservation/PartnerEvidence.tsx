"use client";

import Image from "next/image";
import { useRef } from "react";
import { gsap, useGSAP, reduced } from "@/lib/gsap";
import { partners, partnersBackdrop } from "@/lib/conservation";
import ParallaxMedia from "../ui/ParallaxMedia";
import { Words, Rail } from "../ui/Text";

export default function PartnerEvidence() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || reduced()) return;

      const cards = gsap.utils.toArray<HTMLElement>(".cpartner", el);

      cards.forEach((card, i) => {
        const frame = card.querySelector(".cpartner__frame");
        const img = card.querySelector(".cpartner__img");
        const body = card.querySelectorAll(".cpartner__body > *");

        /* Frame unmasks upward while the photo settles out of an over-scale —
           the same reveal the trip and boat cards use. */
        gsap
          .timeline({ scrollTrigger: { trigger: ".cpartners", start: "top 82%", once: true } })
          .fromTo(
            frame,
            { clipPath: "inset(100% 0 0 0)" },
            { clipPath: "inset(0% 0 0 0)", duration: 1.2, ease: "bp-inOut", delay: i * 0.1 },
            0,
          )
          .fromTo(img, { scale: 1.3 }, { scale: 1, duration: 1.6, ease: "bp-out" }, i * 0.1)
          .fromTo(
            body,
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 0.9, stagger: 0.06 },
            i * 0.1 + 0.5,
          );

        const enter = () => {
          gsap.to(img, { scale: 1.07, duration: 0.9, ease: "power3.out", overwrite: "auto" });
          gsap.to(card, { y: -10, duration: 0.5, ease: "power3.out", overwrite: "auto" });
        };
        const leave = () => {
          gsap.to(img, { scale: 1, duration: 0.9, ease: "power3.out", overwrite: "auto" });
          gsap.to(card, { y: 0, duration: 0.55, ease: "power3.out", overwrite: "auto" });
        };
        card.addEventListener("pointerenter", enter);
        card.addEventListener("pointerleave", leave);
      });
    },
    { scope: ref },
  );

  return (
    <section ref={ref} id="partners" className="section cpartners-sec">
      <ParallaxMedia src={partnersBackdrop} alt="" strength={18} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg,rgba(10,10,9,0.82) 0%,rgba(10,10,9,0.62) 45%,rgba(10,10,9,0.92) 100%)",
        }}
      />

      <div className="shell" style={{ position: "relative", zIndex: 2, paddingTop: "clamp(64px,7vw,96px)", paddingBottom: "clamp(64px,7vw,96px)" }}>
        <div className="cpartners-head">
          <Words
            as="span"
            className="ds-caption csec__eyebrow"
            text="Partner evidence"
            style={{ color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: 3 }}
          />
          {/* Demoted from a display headline to body copy, same reasoning as ReportAnatomy.tsx -
              §4.4 of Tony's audit: one headline-level claim per page ("Conservation you can
              audit, not just trust"), everything else reads as support, not a second headline. */}
          <Words
            className="ds-body-lg csplit__support"
            text="The promise gets stronger when the names are visible. Every partner is named, every report has a date, and the work is tied back to the bookings that funded it."
            style={{ color: "rgba(255,255,255,0.68)" }}
          />
        </div>

        <div className="cpartners">
          {partners.map((p) => (
            <article key={p.slug} className="cpartner">
              <div className="cpartner__frame">
                <span className="cpartner__img">
                  <Image
                    src={p.img}
                    alt={`${p.name}, ${p.region}`}
                    fill
                    sizes="(max-width: 760px) 100vw, (max-width: 1100px) 50vw, 33vw"
                    style={{ objectFit: "cover" }}
                  />
                </span>
                <span className="cpartner__shade" />
                <span className="chip cpartner__chip">Partner</span>
              </div>

              <div className="cpartner__body">
                <div className="ds-headline cpartner__name">{p.name}</div>
                <div className="ds-micro cpartner__region">{p.region}</div>
                <p className="ds-body-sm cpartner__desc">{p.desc}</p>
              </div>

              <div className="cpartner__foot">
                <span className="ds-micro cpartner__footLabel">Next report</span>
                <span className="ds-micro cpartner__footValue">{p.nextReport}</span>
              </div>
            </article>
          ))}
        </div>
      </div>

      <Rail label="Partners" />
    </section>
  );
}
