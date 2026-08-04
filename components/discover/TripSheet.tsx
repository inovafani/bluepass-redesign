"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { gsap, useGSAP, reduced } from "@/lib/gsap";
import { lockScroll, unlockScroll } from "@/lib/lenis";
import { categoryIcon } from "@/lib/discover";
import { threeWays } from "@/lib/data";
import Button from "../ui/Button";
import { MaskLines } from "../ui/Text";
import { useDiscover } from "./DiscoverState";

const aud = (n: number) => "A$" + n.toLocaleString("en-AU");

/** The three ways, keyed to match `Trip.impactSplit`. */
const ways = [
  { key: "protect", ...threeWays[0] },
  { key: "restore", ...threeWays[1] },
  { key: "uplift", ...threeWays[2] },
] as const;

/**
 * The trip sheet — what "View trip" opens.
 *
 * A full-height panel over the page rather than a route: the visitor is still
 * shopping the grid, and losing the scroll position they built up would cost
 * more than the sheet gains. Lenis is stopped while it is open and the panel
 * carries `data-lenis-prevent` so its own scroll stays native.
 *
 * The right-hand column is the reason the sheet exists: it does the 5% sum on
 * this fare and names where the money lands, which is the one number the grid
 * card can only gesture at.
 */
export default function TripSheet() {
  const { openTrip: trip, setOpenTrip, saved, toggleSaved } = useDiscover();
  const rootRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef(false);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [departure, setDeparture] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  /* Each trip opens with its own first departure pre-selected. */
  useEffect(() => {
    setDeparture(trip?.departures[0] ?? null);
  }, [trip]);

  /* ---- page lock, escape, and focus handling --------------------------- */
  useEffect(() => {
    if (!trip) return;
    closingRef.current = false;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    lockScroll();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
      unlockScroll();
      restoreFocusRef.current?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip?.slug]);

  const close = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    const el = rootRef.current;
    if (!el || reduced()) {
      setOpenTrip(null);
      return;
    }
    gsap
      .timeline({ onComplete: () => setOpenTrip(null) })
      .to(el.querySelector(".tsheet__panel"), {
        y: 28,
        opacity: 0,
        duration: 0.34,
        ease: "power2.in",
      })
      .to(el.querySelector(".tsheet__backdrop"), { opacity: 0, duration: 0.3 }, 0.06);
  };

  /* ---- entrance --------------------------------------------------------- */
  useGSAP(
    () => {
      const el = rootRef.current;
      if (!el || !trip) return;

      const panel = el.querySelector(".tsheet__panel");
      el.querySelector<HTMLElement>(".tsheet__close")?.focus({ preventScroll: true });

      if (reduced()) {
        gsap.set([el.querySelector(".tsheet__backdrop"), panel], { opacity: 1, y: 0 });
        gsap.set(".tsheet__seg", { width: (i: number) => `${segWidth(i)}%` });
        return;
      }

      const tl = gsap.timeline();
      tl.fromTo(
        el.querySelector(".tsheet__backdrop"),
        { opacity: 0 },
        { opacity: 1, duration: 0.5 },
        0,
      )
        .fromTo(
          panel,
          { y: 54, opacity: 0, scale: 0.992 },
          { y: 0, opacity: 1, scale: 1, duration: 0.8, ease: "bp-out" },
          0.05,
        )
        /* The photo settles out of an over-scale, the same signature the
           section heroes use — it makes the sheet read as a place, not a modal. */
        .fromTo(
          el.querySelector(".tsheet__photo"),
          { scale: 1.16 },
          { scale: 1, duration: 1.9, ease: "bp-out" },
          0.05,
        )
        .fromTo(
          el.querySelectorAll(".tsheet__fact"),
          { opacity: 0, y: 18 },
          { opacity: 1, y: 0, duration: 0.7, stagger: 0.05 },
          0.5,
        )
        .fromTo(
          el.querySelectorAll(".tsheet__side > *"),
          { opacity: 0, y: 22 },
          { opacity: 1, y: 0, duration: 0.8, stagger: 0.07 },
          0.45,
        );

      /* The contribution counts up to the 5% figure — the sheet's headline
         number, so it lands last and slowest. */
      const node = el.querySelector<HTMLElement>(".tsheet__give-value");
      if (node) {
        const target = Math.round(trip.price * 0.05);
        const obj = { v: 0 };
        gsap.to(obj, {
          v: target,
          duration: 1.7,
          ease: "bp-out",
          delay: 0.7,
          onUpdate: () => {
            node.textContent = aud(Math.round(obj.v));
          },
        });
      }

      gsap.fromTo(
        el.querySelectorAll(".tsheet__seg"),
        { width: 0 },
        {
          width: (i: number) => `${segWidth(i)}%`,
          duration: 1.1,
          ease: "bp-inOut",
          stagger: 0.08,
          delay: 0.75,
        },
      );

      gsap.fromTo(
        el.querySelectorAll(".tsheet__row"),
        { opacity: 0, x: 26 },
        { opacity: 1, x: 0, duration: 0.8, stagger: 0.06, delay: 0.6 },
      );

      function segWidth(i: number) {
        if (!trip) return 0;
        return trip.impactSplit[ways[i].key];
      }
    },
    { dependencies: [trip?.slug] },
  );

  if (!mounted || !trip) return null;

  const give = Math.round(trip.price * 0.05);
  const isSaved = !!saved[trip.slug];

  return createPortal(
    <div
      ref={rootRef}
      className="tsheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tsheet-title"
    >
      <button
        type="button"
        className="tsheet__backdrop"
        aria-label="Close trip details"
        onClick={close}
      />

      <div className="tsheet__panel" data-lenis-prevent>
        <div className="tsheet__scroll">
          {/* ---- photo header ------------------------------------------- */}
          <header className="tsheet__hero">
            <span className="tsheet__photo">
              <Image
                src={trip.img}
                alt={`${trip.name} — ${trip.region}`}
                fill
                priority
                sizes="(max-width: 1000px) 100vw, 1120px"
                style={{ objectFit: "cover" }}
              />
            </span>
            <span className="tsheet__scrim" />

            <div className="tsheet__hero-top">
              <span className="tsheet__chips">
                <span className="chip">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d={categoryIcon[trip.category]} />
                  </svg>
                  {trip.category}
                </span>
                {trip.eco ? (
                  <span className="chip chip--eco">
                    <i />
                    Eco certified
                  </span>
                ) : null}
                {trip.scarcity ? <span className="chip chip--warn">{trip.scarcity}</span> : null}
              </span>

              <span className="tsheet__hero-acts">
                <button
                  type="button"
                  className={`tsheet__icon ${isSaved ? "is-saved" : ""}`}
                  aria-label={isSaved ? `Remove ${trip.name} from saved` : `Save ${trip.name}`}
                  aria-pressed={isSaved}
                  onClick={() => toggleSaved(trip.slug)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20s-7-4.4-7-9.3A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.7c0 4.9-7 9.3-7 9.3z" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="tsheet__icon tsheet__close"
                  aria-label="Close trip details"
                  onClick={close}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </span>
            </div>

            <div className="tsheet__hero-foot">
              <span className="tsheet__loc ds-micro">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 21s-7-5.6-7-11a7 7 0 1 1 14 0c0 5.4-7 11-7 11z" />
                  <circle cx="12" cy="10" r="1.6" />
                </svg>
                {trip.region}
                <span className="trip__dot">·</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 3.5l2.4 5.2 5.6.7-4.1 3.9 1 5.6-4.9-2.8-4.9 2.8 1-5.6L4 9.4l5.6-.7z" />
                </svg>
                {trip.rating} <span className="trip__reviews">({trip.reviews} reviews)</span>
              </span>
              <MaskLines
                as="h2"
                lines={[trip.name]}
                className="ds-display-lg tsheet__title"
                mode="load"
                delay={0.35}
              />
            </div>
          </header>

          {/* ---- body --------------------------------------------------- */}
          <div className="tsheet__body">
            <div className="tsheet__main">
              <p className="ds-body-lg tsheet__summary">{trip.summary}</p>

              <div className="tsheet__facts">
                {[
                  { k: "Operator", v: trip.operator },
                  { k: "Duration", v: trip.duration },
                  { k: "Aboard", v: trip.detail },
                  { k: "From", v: `${aud(trip.price)} /guest` },
                ].map((f) => (
                  <div key={f.k} className="tsheet__fact">
                    <span className="ds-micro tsheet__fact-k">{f.k}</span>
                    <span className="ds-body-sm tsheet__fact-v">{f.v}</span>
                  </div>
                ))}
              </div>

              <section className="tsheet__block">
                <h3 className="ds-caption tsheet__label">Why this one</h3>
                <ul className="tsheet__list">
                  {trip.highlights.map((h) => (
                    <li key={h} className="tsheet__row ds-body">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="tsheet__block">
                <h3 className="ds-caption tsheet__label">The shape of it</h3>
                <ol className="tsheet__days">
                  {trip.itinerary.map((d) => (
                    <li key={d.label} className="tsheet__row tsheet__day">
                      <span className="ds-micro tsheet__day-label">{d.label}</span>
                      <span className="tsheet__day-main">
                        <span className="ds-headline tsheet__day-title">{d.title}</span>
                        <span className="ds-body-sm tsheet__day-desc">{d.desc}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </section>

              <section className="tsheet__block">
                <h3 className="ds-caption tsheet__label">Included</h3>
                <div className="tsheet__incl">
                  {trip.includes.map((i) => (
                    <span key={i} className="tsheet__incl-chip ds-micro">
                      {i}
                    </span>
                  ))}
                </div>
              </section>

              <blockquote className="tsheet__quote">
                <p className="ds-subhead">“{trip.quote}”</p>
                <footer className="ds-micro">{trip.quoteBy}</footer>
              </blockquote>
            </div>

            {/* ---- booking column ------------------------------------- */}
            <aside className="tsheet__side">
              <div className="tsheet__card tsheet__price-card">
                <div className="tsheet__price">
                  <span className="ds-display-md">{aud(trip.price)}</span>
                  <span className="ds-micro">/guest</span>
                </div>
                <div className="ds-micro tsheet__rate">
                  Operator&apos;s rate — never a markup
                </div>

                <div className="tsheet__deps">
                  <span className="ds-micro tsheet__label">Next departures</span>
                  <div className="tsheet__dep-row">
                    {trip.departures.map((d) => (
                      <button
                        key={d}
                        type="button"
                        className={`tsheet__dep ${departure === d ? "is-active" : ""}`}
                        aria-pressed={departure === d}
                        onClick={() => setDeparture(d)}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="tsheet__acts">
                  <Button variant="primary" large magnetic={false}>
                    Request this trip
                  </Button>
                  <Button variant="translucent" large magnetic={false}>
                    Ask Kai →
                  </Button>
                </div>
                <span className="ds-micro tsheet__note">
                  No card needed — Kai confirms with the operator first.
                </span>
              </div>

              <div className="tsheet__card tsheet__give">
                <span className="ds-micro tsheet__label">What the 5% does here</span>
                <div className="tsheet__give-line">
                  <span className="ds-display-md tsheet__give-value">{aud(give)}</span>
                  <span className="ds-body-sm">of this fare</span>
                </div>
                <p className="ds-body-sm tsheet__give-copy">
                  Goes to {trip.fundsPartner} — built into the price you see, not added to it.
                </p>

                <div className="tsheet__bar" aria-hidden>
                  {ways.map((w, i) => (
                    <span
                      key={w.key}
                      className={`tsheet__seg tsheet__seg--${i + 1}`}
                      style={{ width: 0 }}
                    />
                  ))}
                </div>

                <ul className="tsheet__legend">
                  {ways.map((w, i) => (
                    <li key={w.key}>
                      <span className={`tsheet__dot tsheet__seg--${i + 1}`} aria-hidden />
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d={w.iconD} />
                      </svg>
                      <span className="ds-body-sm tsheet__legend-name">{w.title}</span>
                      <span className="ds-micro tsheet__legend-val">
                        {trip.impactSplit[w.key]}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="tsheet__card tsheet__op">
                <span className="tsheet__op-ring" aria-hidden>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3l7 3v6c0 5-3 8-7 9-4-1-7-4-7-9V6z" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                </span>
                <div>
                  <span className="ds-body-sm tsheet__op-name">{trip.operator}</span>
                  <p className="ds-micro tsheet__op-note">{trip.operatorNote}</p>
                </div>
              </div>
            </aside>
          </div>
        </div>

        {/* Mobile keeps the fare and the action in reach while the sheet scrolls. */}
        <div className="tsheet__dock">
          <div>
            <div className="tsheet__price">
              <span className="ds-headline">{aud(trip.price)}</span>
              <span className="ds-micro">/guest</span>
            </div>
            <span className="ds-micro tsheet__dock-give">{aud(give)} to {trip.fundsPartner}</span>
          </div>
          <Button variant="primary" magnetic={false}>
            Request
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
