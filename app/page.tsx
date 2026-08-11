import type { Metadata } from "next";
import DiscoverState from "@/components/discover/DiscoverState";
import DiscoverHero from "@/components/discover/DiscoverHero";
import RegionRail from "@/components/discover/RegionRail";
import TripGrid from "@/components/discover/TripGrid";
import TripSheet from "@/components/discover/TripSheet";
import HowItWorks from "@/components/discover/HowItWorks";
import PartnerMarquee from "@/components/discover/PartnerMarquee";
import SiteFooter from "@/components/SiteFooter";
import { trips as curatedTrips } from "@/lib/discover";
import { fetchSyncedTrips } from "@/lib/services/discover/operator-listings-as-trips";

export const revalidate = 300;

export const metadata: Metadata = {
  /* Just the brand: this is the front door, so the tab shouldn't read like a
     sub-page. "Discover" is the nav label for it, not its title. The other
     routes keep their "<Page> — Bluepass" form. */
  title: "Bluepass",
  description:
    "Whale watching, yacht charters, dive boats and expeditions across the Australian coast — at the operator's own rate, never a markup.",
};

/**
 * Discover, served at the root.
 *
 * It lives here rather than at /discover so the landing page is just
 * bluepass.co — the nav still labels it "Discover", but the URL carries no
 * path. /discover is kept as a redirect to this page so older links survive.
 */
export default async function DiscoverPage() {
  // Real, published operator listings (e.g. from the Rezdy Agent sync) are appended after the
  // curated 6 rather than replacing them - the page never looks sparse while real inventory is
  // still trickling in, and the curated trips keep showcasing the design at its best. Fails open:
  // if the DB read fails for any reason, the curated 6 alone still render.
  const syncedTrips = await fetchSyncedTrips().catch((error) => {
    console.error("discover_page.fetch_synced_trips_failed", error);
    return [];
  });
  const trips = [...curatedTrips, ...syncedTrips];

  return (
    <main style={{ background: "var(--color-canvas)", position: "relative" }}>
      {/* Region, category, shortlist and the open trip are one piece of state —
          the hero select, the rail and the grid are three views onto it. */}
      <DiscoverState trips={trips}>
        <DiscoverHero />
        <RegionRail />
        <TripGrid />
        <TripSheet />
      </DiscoverState>
      <HowItWorks />
      <PartnerMarquee />
      <SiteFooter />
    </main>
  );
}
