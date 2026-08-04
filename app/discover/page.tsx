import type { Metadata } from "next";
import DiscoverState from "@/components/discover/DiscoverState";
import DiscoverHero from "@/components/discover/DiscoverHero";
import RegionRail from "@/components/discover/RegionRail";
import TripGrid from "@/components/discover/TripGrid";
import TripSheet from "@/components/discover/TripSheet";
import HowItWorks from "@/components/discover/HowItWorks";
import PartnerMarquee from "@/components/discover/PartnerMarquee";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Discover — Bluepass",
  description:
    "Whale watching, yacht charters, dive boats and expeditions across the Australian coast — at the operator's own rate, never a markup.",
};

export default function DiscoverPage() {
  return (
    <main style={{ background: "var(--color-canvas)", position: "relative" }}>
      {/* Region, category, shortlist and the open trip are one piece of state —
          the hero select, the rail and the grid are three views onto it. */}
      <DiscoverState>
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
