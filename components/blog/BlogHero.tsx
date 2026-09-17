import type { ReactNode } from "react";
import ParallaxMedia from "@/components/ui/ParallaxMedia";
import { MaskLines } from "@/components/ui/Text";

/**
 * The masthead for /blog and its category archives.
 *
 * Same construction as the Conservation hero — full-bleed `ParallaxMedia`, a gradient scrim, then
 * constrained copy — so the Journal reads as part of the site rather than a bolt-on. Two
 * differences, both deliberate:
 *
 *  - It is shorter than a marketing hero. This page's job is to get someone into an article, and a
 *    full-viewport photo puts the first headline below the fold.
 *  - The scrim lands on solid `--color-canvas` at its last stop rather than fading to a partial
 *    alpha, so the join with the black section underneath is invisible at any viewport height.
 *
 * `lines` is an array because the headline is set by hand, one entry per line. Letting a
 * 62px display face wrap on its own is how you end up with an orphan.
 */
export default function BlogHero({
  lines,
  support,
  eyebrow,
  image,
  children,
}: {
  lines: string[];
  support: string;
  /** Context above the headline. /blog omits it — the headline is the masthead. */
  eyebrow?: string;
  image: string;
  /** The category chips, which sit at the bottom edge of the photo. */
  children?: ReactNode;
}) {
  return (
    <section className="section bp-blog__hero">
      <ParallaxMedia
        src={image}
        alt=""
        strength={12}
        intro
        priority
        scrim="linear-gradient(180deg, rgba(10,10,9,0.72) 0%, rgba(10,10,9,0.44) 38%, rgba(10,10,9,0.9) 80%, #0a0a09 100%)"
      />

      <div className="shell bp-blog__head">
        {eyebrow ? <span className="ds-micro bp-blog__eyebrow">{eyebrow}</span> : null}

        <MaskLines as="h1" className="ds-display-lg bp-blog__title" lines={lines} mode="load" delay={0.25} />

        <p className="ds-body-lg bp-blog__support">{support}</p>

        {children}
      </div>
    </section>
  );
}
