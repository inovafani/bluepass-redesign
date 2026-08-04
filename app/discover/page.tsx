import type { Metadata } from "next";
import DiscoverHero from "@/components/discover/DiscoverHero";
import RegionRail from "@/components/discover/RegionRail";
import TripGrid from "@/components/discover/TripGrid";
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
      <DiscoverHero />
      <RegionRail />
      <TripGrid />
      <HowItWorks />
      <PartnerMarquee />
      <SiteFooter />
    </main>
  );
}
