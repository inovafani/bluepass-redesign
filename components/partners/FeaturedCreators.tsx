"use client";

import Image from "next/image";
import { useRef } from "react";
import { gsap, useGSAP, reduced } from "@/lib/gsap";
import { creators } from "@/lib/partners";
import { MaskLines, Words } from "../ui/Text";

/** Tall portrait cards; the description slides up from under the name on hover. */
export default function FeaturedCreators() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || reduced()) return;

      const cards = gsap.utils.toArray<HTMLElement>(".pcreator", el);

      cards.forEach((card, i) => {
        const frame = card.querySelector(".pcreator__frame");
        const img = card.querySelector(".pcreator__img");
        const meta = card.querySelectorAll(".pcreator__meta > *");

        gsap
          .timeline({ scrollTrigger: { trigger: ".pcreators", start: "top 82%", once: true } })
          .fromTo(
            frame,
            { clipPath: "inset(100% 0 0 0)" },
            { clipPath: "inset(0% 0 0 0)", duration: 1.2, ease: "bp-inOut", delay: i * 0.1 },
            0,
          )
          .fromTo(img, { scale: 1.32 }, { scale: 1, duration: 1.6, ease: "bp-out" }, i * 0.1)
          .fromTo(meta, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.9, stagger: 0.06 }, i * 0.1 + 0.5);

        const desc = card.querySelector(".pcreator__desc");
        card.addEventListener("pointerenter", () => {
          gsap.to(img, { scale: 1.07, duration: 0.9, ease: "power3.out", overwrite: "auto" });
          gsap.to(card, { y: -10, duration: 0.5, ease: "power3.out", overwrite: "auto" });
          gsap.to(desc, { height: "auto", opacity: 1, duration: 0.55, ease: "bp-inOut", overwrite: "auto" });
        });
        card.addEventListener("pointerleave", () => {
          gsap.to(img, { scale: 1, duration: 0.9, ease: "power3.out", overwrite: "auto" });
          gsap.to(card, { y: 0, duration: 0.55, ease: "power3.out", overwrite: "auto" });
          gsap.to(desc, { height: 0, opacity: 0, duration: 0.45, ease: "bp-inOut", overwrite: "auto" });
        });
      });
    },
    { scope: ref },
  );

  return (
    <section ref={ref} className="section shell pcreators-sec">
      <div className="pcreators__head">
        <Words
          as="span"
          className="ds-caption csec__eyebrow"
          text="Featured partners"
          style={{ color: "var(--color-ink-muted)", textTransform: "uppercase", letterSpacing: 3 }}
        />
        <MaskLines
          lines={["The kind of taste Bluepass is built for."]}
          className="ds-display-lg"
          style={{ marginTop: 16 }}
        />
      </div>

      <div className="pcreators">
        {creators.map((c) => (
          <article key={c.slug} className="pcreator">
            <div className="pcreator__frame">
              <span className="pcreator__img">
                <Image
                  src={c.img}
                  alt={`${c.name}, ${c.region}`}
                  fill
                  sizes="(max-width: 760px) 100vw, (max-width: 1100px) 50vw, 33vw"
                  style={{ objectFit: "cover" }}
                />
              </span>
              <span className="pcreator__shade" />
              <span className="chip pcreator__handle">{c.handle}</span>

              <div className="pcreator__meta">
                <span className="ds-micro pcreator__region">{c.region}</span>
                <h3 className="ds-headline pcreator__name">{c.name}</h3>
                <p className="ds-body-sm pcreator__desc">{c.desc}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
