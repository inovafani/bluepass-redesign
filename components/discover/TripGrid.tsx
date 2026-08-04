"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { gsap, useGSAP, reduced } from "@/lib/gsap";
import { trips, categories, categoryIcon, type Category } from "@/lib/discover";
import Button from "../ui/Button";
import { MaskLines } from "../ui/Text";

type Filter = "All" | Category;
const filters: Filter[] = ["All", ...categories];

const aud = (n: number) => "A$" + n.toLocaleString("en-AU");

export default function TripGrid() {
  const ref = useRef<HTMLElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const [filter, setFilter] = useState<Filter>("All");
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  const visible = filter === "All" ? trips : trips.filter((t) => t.category === filter);

  /* ---- filter pill indicator, same language as the top nav ------------ */
  const moveIndicator = (index: number) => {
    const pill = pillRef.current;
    const ind = indicatorRef.current;
    if (!pill || !ind) return;
    const target = pill.querySelectorAll("button")[index] as HTMLElement | undefined;
    if (!target) return;
    gsap.to(ind, {
      x: target.offsetLeft - 5,
      width: target.offsetWidth,
      duration: reduced() ? 0 : 0.55,
      ease: "bp-out",
      overwrite: true,
    });
  };

  useGSAP(
    () => {
      const run = () => moveIndicator(filters.indexOf(filter));
      run();
      document.fonts?.ready.then(run);
      window.addEventListener("resize", run);
      return () => window.removeEventListener("resize", run);
    },
    { dependencies: [filter] },
  );

  /* Cards clear out before the set changes, so the grid never pops. */
  const changeFilter = (next: Filter) => {
    if (next === filter) return;
    if (reduced()) {
      setFilter(next);
      return;
    }
    const cards = gsap.utils.toArray<HTMLElement>(".trip", ref.current);
    gsap.to(cards, {
      opacity: 0,
      y: 16,
      scale: 0.985,
      duration: 0.3,
      stagger: 0.025,
      ease: "power2.in",
      onComplete: () => setFilter(next),
    });
  };

  /* ---- entrance / re-entrance on every filter change ------------------ */
  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const cards = gsap.utils.toArray<HTMLElement>(".trip", el);

      if (reduced()) {
        gsap.set(cards, { opacity: 1, y: 0, scale: 1 });
        return;
      }

      gsap.fromTo(
        cards,
        { opacity: 0, y: 48, scale: 0.985 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 1.05,
          stagger: 0.07,
          ease: "bp-out",
          clearProps: "transform",
        },
      );

      cards.forEach((card) => {
        const img = card.querySelector(".trip__img");
        const cta = card.querySelector(".trip__cta");
        card.addEventListener("pointerenter", () => {
          gsap.to(img, { scale: 1.07, duration: 0.9, ease: "power3.out", overwrite: "auto" });
          gsap.to(card, { y: -8, duration: 0.5, ease: "power3.out", overwrite: "auto" });
          gsap.to(cta, { x: 4, duration: 0.5, ease: "power3.out", overwrite: "auto" });
        });
        card.addEventListener("pointerleave", () => {
          gsap.to(img, { scale: 1, duration: 0.9, ease: "power3.out", overwrite: "auto" });
          gsap.to(card, { y: 0, duration: 0.55, ease: "power3.out", overwrite: "auto" });
          gsap.to(cta, { x: 0, duration: 0.5, ease: "power3.out", overwrite: "auto" });
        });
      });
    },
    { scope: ref, dependencies: [filter] },
  );

  const toggleSave = (slug: string, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setSaved((s) => ({ ...s, [slug]: !s[slug] }));
    if (!reduced()) {
      gsap.fromTo(
        e.currentTarget,
        { scale: 0.75 },
        { scale: 1, duration: 0.6, ease: "back.out(3.5)" },
      );
    }
  };

  return (
    <section ref={ref} className="section shell" style={{ paddingTop: 72, paddingBottom: "clamp(64px,7vw,96px)" }}>
      <div className="tgrid__head">
        <div>
          <MaskLines lines={["Across Australia"]} className="ds-display-md" />
          <span className="ds-body-sm" style={{ color: "var(--color-ink-muted)", marginTop: 8, display: "block" }}>
            {visible.length} vetted {visible.length === 1 ? "trip" : "trips"}
            {filter !== "All" ? ` · ${filter}` : ""}
          </span>
        </div>

        <div ref={pillRef} className="tfilters">
          <span ref={indicatorRef} className="tfilters__ind" aria-hidden />
          {filters.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => changeFilter(f)}
              aria-pressed={filter === f}
              className={filter === f ? "is-active" : ""}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="tgrid">
        {visible.map((t) => (
          <article key={t.slug} className="trip">
            <div className="trip__frame">
              <span className="trip__img">
                <Image
                  src={t.img}
                  alt={`${t.name} — ${t.region}`}
                  fill
                  sizes="(max-width: 760px) 100vw, (max-width: 1180px) 50vw, 33vw"
                  style={{ objectFit: "cover" }}
                />
              </span>
              <span className="trip__shade" />

              <span className="trip__chips">
                <span className="chip">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d={categoryIcon[t.category]} />
                  </svg>
                  {t.category}
                </span>
                {t.eco ? (
                  <span className="chip chip--eco">
                    <i />
                    Eco certified
                  </span>
                ) : null}
              </span>

              <button
                type="button"
                className={`trip__save ${saved[t.slug] ? "is-saved" : ""}`}
                aria-label={saved[t.slug] ? `Remove ${t.name} from saved` : `Save ${t.name}`}
                aria-pressed={!!saved[t.slug]}
                onClick={(e) => toggleSave(t.slug, e)}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20s-7-4.4-7-9.3A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.7c0 4.9-7 9.3-7 9.3z" />
                </svg>
              </button>

              <div className="trip__title">
                <span className="trip__loc ds-micro">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 21s-7-5.6-7-11a7 7 0 1 1 14 0c0 5.4-7 11-7 11z" />
                    <circle cx="12" cy="10" r="1.6" />
                  </svg>
                  {t.region}
                  <span className="trip__dot">·</span>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 3.5l2.4 5.2 5.6.7-4.1 3.9 1 5.6-4.9-2.8-4.9 2.8 1-5.6L4 9.4l5.6-.7z" />
                  </svg>
                  {t.rating} <span className="trip__reviews">({t.reviews})</span>
                </span>
                <h3 className="ds-display-md trip__name">{t.name}</h3>
              </div>
            </div>

            <div className="trip__body">
              <div className="ds-body-sm trip__meta">
                {t.operator} <span className="trip__dot">·</span> {t.duration}{" "}
                <span className="trip__dot">·</span> {t.detail}
              </div>

              <div className="trip__impact ds-micro">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 14c2-2.5 4-2.5 6 0s4 2.5 6 0 4-2.5 6 0" />
                  <path d="M12 4c2 2.5 2 5 0 7-2-2-2-4.5 0-7z" />
                </svg>
                <span>
                  <b>5%</b> {t.impact}
                </span>
              </div>

              <p className="trip__quote ds-body-sm">“{t.quote}”</p>

              {t.scarcity ? <span className="trip__scarcity ds-micro">{t.scarcity}</span> : null}

              <div className="trip__foot">
                <div>
                  <div className="trip__price">
                    <span className="ds-display-md">{aud(t.price)}</span>
                    <span className="ds-micro">/guest</span>
                  </div>
                  <div className="ds-micro trip__rate">Operator&apos;s rate — never a markup</div>
                </div>
                <span className="trip__cta">
                  <Button variant="translucent">View trip</Button>
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
