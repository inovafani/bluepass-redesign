import type { Metadata } from "next";
import PartnersHero from "@/components/partners/PartnersHero";
import WhyPartner from "@/components/partners/WhyPartner";
import QuietMoves from "@/components/partners/QuietMoves";
import Toolkit, { type PartnerToolkitState } from "@/components/partners/Toolkit";
import FeaturedCreators from "@/components/partners/FeaturedCreators";
import ReelProof from "@/components/partners/ReelProof";
import PartnersCta from "@/components/partners/PartnersCta";
import SiteFooter from "@/components/SiteFooter";
import { currentPartnerAccess } from "@/lib/services/partner/guard";
import { loadPartnerReferralLinks } from "@/lib/services/partner/dashboard";

export const metadata: Metadata = {
  title: "Partners | Bluepass",
  description:
    "Send your divers to Indonesia's best operators. They pay the operator's own rate, you earn on every booking, and 5% of every fare funds reef conservation.",
};

/**
 * A signed-in, already-approved partner sees their own real tracked link in the toolkit console
 * instead of the illustrative `bluepass.co/p/your-company` demo - everyone else (signed out, or
 * still pending review) sees the demo/pending state, since there is nothing real to show them yet.
 */
async function loadToolkitState(): Promise<PartnerToolkitState> {
  const access = await currentPartnerAccess();

  if (!access.ok) {
    return { kind: "demo" };
  }

  if (access.profile.status !== "APPROVED" || !access.profile.referralPartnerId) {
    return { kind: "pending" };
  }

  const links = await loadPartnerReferralLinks(access.profile.referralPartnerId);
  const mainLink = links.find((link) => link.active) ?? links[0];

  if (!mainLink) {
    return { kind: "pending" };
  }

  return { kind: "live", shareUrl: mainLink.shareUrl, clickCount: mainLink.clickCount };
}

export default async function PartnersPage() {
  const toolkitState = await loadToolkitState();

  return (
    <main style={{ background: "var(--color-canvas)", position: "relative" }}>
      <PartnersHero />
      <WhyPartner />
      <QuietMoves />
      <Toolkit state={toolkitState} />
      <FeaturedCreators />
      <ReelProof />
      <PartnersCta />
      <SiteFooter />
    </main>
  );
}
