"use client";

import { useRef, useState } from "react";
import { gsap, useGSAP, reduced } from "@/lib/gsap";
import { discoverHero, regions, whenOptions, guestOptions, ALL_REGIONS } from "@/lib/discover";
import ParallaxMedia from "../ui/ParallaxMedia";
import { MaskLines, Rail } from "../ui/Text";
import Button from "../ui/Button";
import { useDiscover } from "./DiscoverState";

/** A field in the search bar. Native <select> keeps it keyboard- and mobile-native. */
function Field({
  label,
  icon,
  options,
  value,
  onChange,
}: {
  label: string;
  icon: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="dfield">
      <span className="dfield__label ds-micro">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d={icon} />
        </svg>
        {label}
      </span>
      <span className="dfield__control">
        <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <svg className="dfield__chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </span>
    </label>
  );
}

export default function DiscoverHero() {
  const ref = useRef<HTMLElement>(null);
  /* Region is shared with the rail and the grid; when/guests stay local until
     there is a real availability API to send them to. */
  const { region, setRegion, goToResults } = useDiscover();
  const [when, setWhen] = useState(whenOptions[0]);
  const [guests, setGuests] = useState(guestOptions[1]);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || reduced()) return;

      gsap
        .timeline({ delay: 0.3 })
        .from(".phero__badge", { opacity: 0, y: 18, duration: 0.9 }, 0.35)
        .from(".phero__copy", { opacity: 0, y: 24, duration: 1 }, 1.25)
        .from(
          ".dsearch",
          { opacity: 0, y: 34, duration: 1.1, ease: "bp-out" },
          1.4,
        )
        .from(
          ".dsearch .dfield, .dsearch .dsearch__submit",
          { opacity: 0, y: 14, duration: 0.8, stagger: 0.07 },
          1.55,
        );

      /* Content lifts away as the page scrolls, same signature as the home hero. */
      gsap
        .timeline({ scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: 0.6 } })
        .to(".phero__content", { y: -90, opacity: 0, ease: "none" }, 0);
    },
    { scope: ref },
  );

  return (
    <section ref={ref} className="section phero">
      <ParallaxMedia src={discoverHero} alt="" strength={16} intro priority />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(10,10,9,0.62) 0%, rgba(10,10,9,0.34) 42%, rgba(10,10,9,0.86) 100%)",
        }}
      />

      <div className="phero__content shell">
        <span className="phero__badge ds-caption">
          <i />
          Australia&apos;s coastline, one conversation away
        </span>

        <MaskLines
          as="h1"
          className="ds-display-xl"
          lines={["Book the ocean.", "Leave it better."]}
          mode="load"
          delay={0.6}
          stagger={0.14}
        />

        <p className="phero__copy ds-body-lg">
          Whale watching, yacht charters, dive boats and expeditions across the Australian coast — at
          the operator&apos;s own rate, never a markup. 5% of every booking funds the waters your
          guests visit.
        </p>

        <div className="dsearch">
          <Field
            label="Region"
            icon="M12 21s-7-5.6-7-11a7 7 0 1 1 14 0c0 5.4-7 11-7 11zM12 10a1 1 0 1 0 .01 0"
            options={[ALL_REGIONS, ...regions.map((r) => r.name)]}
            value={region}
            onChange={setRegion}
          />
          <span className="dsearch__rule" />
          <Field
            label="When"
            icon="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4"
            options={whenOptions}
            value={when}
            onChange={setWhen}
          />
          <span className="dsearch__rule" />
          <Field
            label="Guests"
            icon="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2 20c.7-4 3.6-6 7-6s6.3 2 7 6M17 4.5a3.5 3.5 0 0 1 0 7M22 20c-.5-3-1.9-4.8-4-5.6"
            options={guestOptions}
            value={guests}
            onChange={setGuests}
          />
          <span className="dsearch__submit">
            <Button variant="primary" large magnetic={false} onClick={goToResults}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="6.5" />
                <path d="M16 16l4.5 4.5" />
              </svg>
              Search
            </Button>
          </span>
        </div>
      </div>

      <Rail label="Discover" />
    </section>
  );
}
