import type { Metadata } from "next";
import PartnersHero from "@/components/partners/PartnersHero";
import WhyPartner from "@/components/partners/WhyPartner";
import QuietMoves from "@/components/partners/QuietMoves";
import Toolkit from "@/components/partners/Toolkit";
import FeaturedCreators from "@/components/partners/FeaturedCreators";
import ReelProof from "@/components/partners/ReelProof";
import PartnersCta from "@/components/partners/PartnersCta";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Partners | Bluepass",
  description:
    "Send your divers to Indonesia's best operators. They pay the operator's own rate, you earn on every booking, and 5% of every fare funds reef conservation.",
};

export default function PartnersPage() {
  return (
    <main style={{ background: "var(--color-canvas)", position: "relative" }}>
      <PartnersHero />
      <WhyPartner />
      <QuietMoves />
      <Toolkit />
      <FeaturedCreators />
      <ReelProof />
      <PartnersCta />
      <SiteFooter />
    </main>
  );
}
