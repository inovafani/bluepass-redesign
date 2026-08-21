"use client";

import { useRef, useState } from "react";
import { gsap, useGSAP, reduced } from "@/lib/gsap";
import { partners, promises } from "@/lib/conservation";
import { MaskLines, Words } from "../ui/Text";

/**
 * Three commitments as an expander stack rather than three flat cards.
 *
 * Each open panel *shows* its commitment instead of only describing it — the
 * contribution draws its split, the rhythm lays out its months, the partner
 * rule names the partners. That is the whole argument of the page, so the
 * section should demonstrate it, not restate it.
 */
export default function PromiseGrid() {
  const ref = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(0);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || reduced()) return;

      const rows = gsap.utils.toArray<HTMLElement>(".cprom", el);

      gsap.from(rows, {
        opacity: 0,
        y: 40,
        duration: 1,
        stagger: 0.1,
        ease: "bp-out",
        scrollTrigger: { trigger: ".cprom-stack", start: "top 84%", once: true },
      });

      gsap.from(".cprom__index", {
        scaleX: 0,
        transformOrigin: "left center",
        duration: 1,
        stagger: 0.1,
        delay: 0.2,
        ease: "bp-inOut",
        scrollTrigger: { trigger: ".cprom-stack", start: "top 84%", once: true },
      });
    },
    { scope: ref },
  );

  /* The open panel animates its own height so the stack never jumps. */
  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      gsap.utils.toArray<HTMLElement>(".cprom", el).forEach((row, i) => {
        const body = row.querySelector<HTMLElement>(".cprom__body");
        if (!body) return;
        const isOpen = i === open;
        if (reduced()) {
          gsap.set(body, { height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 });
          return;
        }
        gsap.to(body, {
          height: isOpen ? "auto" : 0,
          opacity: isOpen ? 1 : 0,
          duration: 0.65,
          ease: "bp-inOut",
          overwrite: "auto",
        });
        if (isOpen) {
          gsap.fromTo(
            body.querySelectorAll(".cprom__reveal"),
            { opacity: 0, y: 14 },
            { opacity: 1, y: 0, duration: 0.8, stagger: 0.07, delay: 0.15, overwrite: "auto" },
          );
          gsap.fromTo(
            body.querySelectorAll(".cbar__seg"),
            { scaleX: 0 },
            { scaleX: 1, duration: 1, ease: "bp-inOut", stagger: 0.1, delay: 0.2, overwrite: "auto" },
          );
        }
      });
    },
    { dependencies: [open], scope: ref },
  );

  return (
    <section ref={ref} id="where-it-goes" className="section shell cpromise">
      <div className="csplit">
        <div className="csplit__lead">
          <Words
            as="span"
            className="ds-caption csec__eyebrow"
            text="The promise"
            style={{ color: "var(--color-ink-muted)", textTransform: "uppercase", letterSpacing: 3 }}
          />
          <MaskLines
            lines={["Conservation you can", "audit, not just trust."]}
            className="ds-display-lg"
            style={{ marginTop: 16 }}
          />
          <Words
            className="ds-body csplit__support"
            text="Three commitments hold the reporting layer together: a fixed contribution, a public rhythm, and a named partner behind every claim."
          />
          <span className="csplit__hint ds-micro">Select a commitment to see how it works →</span>
        </div>

        <div className="cprom-stack">
          {promises.map((p, i) => (
            <div key={p.n} className={`cprom ${i === open ? "is-open" : ""}`}>
              <button
                type="button"
                className="cprom__head"
                aria-expanded={i === open}
                onClick={() => setOpen(i)}
                onPointerEnter={() => setOpen(i)}
              >
                <span className="cprom__n ds-micro">{p.n}</span>
                <span className="cprom__value">{p.value}</span>
                <span className="cprom__index" aria-hidden />
                <span className="cprom__label ds-micro">{p.label}</span>
                <span className="cprom__chev" aria-hidden>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </span>
              </button>

              <div className="cprom__body">
                <div className="cprom__bodyInner">
                  <p className="cprom__desc cprom__reveal ds-body-sm">{p.desc}</p>

                  {/* 01 — the split, drawn */}
                  {p.n === "01" ? (
                    <div className="cprom__reveal cbar">
                      <div className="cbar__track">
                        <span className="cbar__seg cbar__seg--operator" />
                        <span className="cbar__seg cbar__seg--ocean" />
                      </div>
                      <div className="cbar__legend">
                        <span className="ds-micro">
                          <i className="cbar__key cbar__key--operator" /> Operator 95%
                        </span>
                        <span className="ds-micro">
                          <i className="cbar__key cbar__key--ocean" /> Ocean 5%
                        </span>
                      </div>
                    </div>
                  ) : null}

                  {/* 02 — the rhythm, laid out */}
                  {p.n === "02" ? (
                    <div className="cprom__reveal cmonths">
                      {["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"].map((m, mi) => (
                        <span key={m} className={`cmonth ${mi === 0 ? "is-first" : ""}`}>
                          <span className="ds-micro">{m}</span>
                          <i />
                        </span>
                      ))}
                      <span className="cmonths__note ds-micro">One dated note per month, indefinitely.</span>
                    </div>
                  ) : null}

                  {/* 03 — the rule, with the names on it */}
                  {p.n === "03" ? (
                    <div className="cprom__reveal cnames">
                      {/* Read off the partner list rather than repeated here —
                          the two copies had already drifted apart once. */}
                      {partners.map(({ name: n }) => (
                        <span key={n} className="cname ds-micro">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 13l4 4L19 7" />
                          </svg>
                          {n}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
