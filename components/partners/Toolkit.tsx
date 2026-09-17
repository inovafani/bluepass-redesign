"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { gsap, useGSAP, reduced } from "@/lib/gsap";
import { audiences, toolkit } from "@/lib/partners";
import { MaskLines, Words } from "../ui/Text";

const DEMO_LINK = "bluepass.co/p/your-company";

/**
 * What the console shows: an illustrative demo for a prospect who hasn't applied yet (or is still
 * pending review), or the visitor's own real tracked link once Bluepass has approved them. `page.tsx`
 * resolves this server-side via `currentPartnerAccess()`/`loadPartnerReferralLinks` - this component
 * never fetches anything itself.
 */
export type PartnerToolkitState =
  | { kind: "demo" }
  | { kind: "pending" }
  | { kind: "live"; shareUrl: string; clickCount: number };

/**
 * The toolkit as a working console rather than a list of features — the tracked link is the thing
 * a partner actually receives, so it behaves like one: the demo types itself in, a real one is
 * just shown, and the copy button really copies whichever is on screen.
 */
export default function Toolkit({ state }: { state: PartnerToolkitState }) {
  const ref = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);
  const isDemo = state.kind === "demo";
  const liveSlug = state.kind === "live" ? state.shareUrl.replace(/^https?:\/\//, "") : "";

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      if (reduced()) return;

      const tl = gsap.timeline({
        scrollTrigger: { trigger: ".ptool", start: "top 82%", once: true },
      });

      tl.from(".ptool", { opacity: 0, y: 50, duration: 1.1, ease: "bp-out" })
        .from(".ptool__bar", { opacity: 0, y: -10, duration: 0.7 }, "-=0.6")
        .from(".ptool__link", { opacity: 0, y: 12, duration: 0.8 }, "-=0.4")
        .from(".ptile", { opacity: 0, y: 26, duration: 0.9, stagger: 0.08 }, "-=0.45");

      /* The slug types itself only for the illustrative demo - a real, already-issued link (the
         "live" state) is shown outright, there's nothing to fake-type. */
      if (isDemo) {
        const slug = el.querySelector<HTMLElement>(".ptool__slug");
        if (slug) {
          const o = { i: 0 };
          tl.to(
            o,
            {
              i: DEMO_LINK.length,
              duration: 1.1,
              ease: "none",
              onUpdate: () => {
                slug.textContent = DEMO_LINK.slice(0, Math.round(o.i));
              },
            },
            "-=1.1",
          );
        }
      }

      gsap.from(".paud .pchip", {
        opacity: 0,
        y: 14,
        duration: 0.7,
        stagger: 0.05,
        scrollTrigger: { trigger: ".paud", start: "top 92%", once: true },
      });
    },
    { scope: ref, dependencies: [isDemo] },
  );

  const copy = async (e: React.MouseEvent<HTMLButtonElement>) => {
    const textToCopy = state.kind === "live" ? state.shareUrl : "https://" + DEMO_LINK;
    try {
      await navigator.clipboard.writeText(textToCopy);
    } catch {
      /* clipboard can be blocked; the confirmation still reflects the attempt */
    }
    setCopied(true);
    if (!reduced()) {
      gsap.fromTo(e.currentTarget, { scale: 0.9 }, { scale: 1, duration: 0.5, ease: "back.out(3)" });
    }
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <section ref={ref} className="section shell ptool-sec">
      <div className="csplit">
        <div className="csplit__lead">
          <Words
            as="span"
            className="ds-caption csec__eyebrow"
            text="What you get"
            style={{ color: "var(--color-ink-muted)", textTransform: "uppercase", letterSpacing: 3 }}
          />
          <MaskLines
            lines={["Everything useful.", "Nothing new to operate."]}
            className="ds-display-lg"
            style={{ marginTop: 16 }}
          />
          <Words
            className="ds-body csplit__support"
            text="No new software, no dashboard to learn, no inventory to hold. You keep the relationship. Bluepass carries the booking."
          />
          <div className="paud">
            {audiences.map((a) => (
              <span key={a} className="pchip ds-micro">
                {a}
              </span>
            ))}
          </div>
        </div>

        <div className="ptool">
          <div className="ptool__bar">
            <span className="ds-body-sm ptool__title">Partner toolkit</span>
            <span className="ds-micro ptool__badge">
              <i />
              Founding 5%
            </span>
          </div>

          {state.kind === "pending" ? (
            <div className="ptool__link ptool__link--pending">
              <span className="ds-body-sm">
                Your application is with Bluepass for review — your real tracked link appears here
                the moment it's approved.
              </span>
            </div>
          ) : (
            <div className="ptool__link">
              <span className="ptool__proto ds-body-sm">https://</span>
              <span className="ptool__slug ds-body-sm">{state.kind === "live" ? liveSlug : DEMO_LINK}</span>
              <button type="button" className="ptool__copy ds-micro" onClick={copy}>
                {copied ? (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                    Copied
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="11" height="11" rx="2" />
                      <path d="M5 15V5h10" />
                    </svg>
                    Copy
                  </>
                )}
              </button>
              <span className="ptool__tracked ds-micro">
                {state.kind === "live" ? `${state.clickCount} click${state.clickCount === 1 ? "" : "s"}` : "Tracked"}
              </span>
            </div>
          )}

          <div className="ptiles">
            {toolkit.map((t) => (
              <div key={t.title} className="ptile">
                <span className="ptile__ring">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d={t.iconD} />
                  </svg>
                </span>
                <span className="ds-body-sm ptile__title">{t.title}</span>
                <span className="ds-micro ptile__note">{t.note}</span>
              </div>
            ))}
          </div>

          {state.kind === "live" ? (
            <Link href="/partner-portal" className="ds-micro ptool__dashboard-link">
              Open your dashboard →
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
