import type { Metadata } from "next";
// import Hero from "@/components/Hero";
// import WhySection from "@/components/WhySection";
import ExploreSection from "@/components/ExploreSection";
import ConservationSection from "@/components/ConservationSection";
import PartnersSection from "@/components/PartnersSection";
import CtaFooter from "@/components/CtaFooter";

export const metadata: Metadata = {
  title: "Explore — Bluepass",
  description:
    "A small network of vetted ocean operators — booked at the price you see, with a fixed 5% of every fare going back to the water.",
};

/**
 * The Explore page.
 *
 * This is what used to be the site root. It moved to its own route when "/"
 * became a redirect to Discover, so the nav's last entry has a real page to
 * point at rather than a URL that bounces somewhere else.
 *
 * Hero and WhySection are commented out rather than deleted — the page opens on
 * the boat grid now, but both components are untouched and still compile, so
 * restoring the old opening is a matter of uncommenting the two imports, the two
 * tags below, and dropping `page--nav-offset` from <main>.
 *
 * That class only exists because Hero is gone: it used to run full-bleed under
 * the transparent nav and supply its own top space. ExploreSection's `pad-y`
 * bottoms out at 64px, which is less than the 76px nav, so the eyebrow would
 * otherwise sit behind the bar on narrow viewports.
 */
export default function ExplorePage() {
  return (
    <main
      className="page--nav-offset"
      style={{ background: "var(--color-canvas)", position: "relative" }}
    >
      {/* <Hero /> */}
      {/* <WhySection /> */}
      <ExploreSection />
      <ConservationSection />
      <PartnersSection />
      <CtaFooter />
    </main>
  );
}
