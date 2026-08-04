import Hero from "@/components/Hero";
import WhySection from "@/components/WhySection";
import ExploreSection from "@/components/ExploreSection";
import ConservationSection from "@/components/ConservationSection";
import PartnersSection from "@/components/PartnersSection";
import CtaFooter from "@/components/CtaFooter";

export default function Page() {
  return (
    <main style={{ background: "var(--color-canvas)", position: "relative" }}>
      <Hero />
      <WhySection />
      <ExploreSection />
      <ConservationSection />
      <PartnersSection />
      <CtaFooter />
    </main>
  );
}
