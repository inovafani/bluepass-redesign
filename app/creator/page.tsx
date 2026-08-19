import AdminPageHeader from "@/components/admin/AdminPageHeader";
import CreatorCommissionStats from "@/components/creator/CreatorCommissionStats";
import CreatorProfileSettings from "@/components/creator/CreatorProfileSettings";
import CreatorReferralLinks from "@/components/creator/CreatorReferralLinks";
import { loadCreatorCommissionSummary, loadCreatorReferralLinks } from "@/lib/services/creator/dashboard";
import { requireCreatorOrRedirect } from "@/lib/services/creator/guard";

export const metadata = { title: "Your creator dashboard · Bluepass" };

/**
 * What a creator sees when they sign in: their referral link and how it's doing, what they've
 * earned, and their own profile to edit. The gate runs again here for the same reason the operator
 * page's does — see requireOperatorOrRedirect.
 */
export default async function CreatorDashboardPage() {
  const { profile } = await requireCreatorOrRedirect("/creator");

  const [links, commissionSummary] = await Promise.all([
    loadCreatorReferralLinks(profile.referralPartnerId),
    loadCreatorCommissionSummary(profile.referralPartnerId),
  ]);

  return (
    <>
      <AdminPageHeader
        eyebrow="Your account"
        title={profile.handle ?? "Your creator dashboard"}
        support="Your referral link, what it's earned so far, and your own profile."
      />

      <CreatorReferralLinks status={profile.status} links={links} />
      <CreatorCommissionStats summary={commissionSummary} />
      <CreatorProfileSettings profile={profile} />
    </>
  );
}
