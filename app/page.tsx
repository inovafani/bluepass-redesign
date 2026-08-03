import SmoothScroll from "@/components/SmoothScroll";
import Grain from "@/components/Grain";
import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import WhySection from "@/components/WhySection";
import ExploreSection from "@/components/ExploreSection";
import ConservationSection from "@/components/ConservationSection";
import PartnersSection from "@/components/PartnersSection";
import CtaFooter from "@/components/CtaFooter";
import KaiChat from "@/components/KaiChat";

export default function Page() {
  return (
    <>
      <SmoothScroll />
      <Grain />

      {/* Sections abut directly — one continuous dark canvas, no dividers. */}
      <div style={{ background: "var(--color-canvas)", position: "relative" }}>
        <Nav />
        <Hero />
        <WhySection />
        <ExploreSection />
        <ConservationSection />
        <PartnersSection />
        <CtaFooter />
      </div>

      <KaiChat />
    </>
  );
}
