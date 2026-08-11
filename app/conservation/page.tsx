import type { Metadata } from "next";
import ConservationHero from "@/components/conservation/ConservationHero";
import PromiseGrid from "@/components/conservation/PromiseGrid";
import PartnerEvidence from "@/components/conservation/PartnerEvidence";
import ReportAnatomy from "@/components/conservation/ReportAnatomy";
import ConservationCta from "@/components/conservation/ConservationCta";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Conservation | Bluepass",
  description:
    "5% of every Bluepass booking goes back to the ocean. Named partners, dated reports, and a public record of where booking contributions go.",
};

export default function ConservationPage() {
  return (
    <main style={{ background: "var(--color-canvas)", position: "relative" }}>
      <ConservationHero />
      <PromiseGrid />
      <PartnerEvidence />
      <ReportAnatomy />
      <ConservationCta />
      <SiteFooter />
    </main>
  );
}
