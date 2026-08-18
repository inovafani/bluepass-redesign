import AdminPageHeader from "@/components/admin/AdminPageHeader";
import OperatorBookings from "@/components/operator/OperatorBookings";
import OperatorListings from "@/components/operator/OperatorListings";
import OperatorProfileSummary from "@/components/operator/OperatorProfileSummary";
import { loadOperatorBookings, loadOperatorListings } from "@/lib/services/operator/dashboard";
import { requireOperatorOrRedirect } from "@/lib/services/operator/guard";

export const metadata = { title: "Your operator dashboard · Bluepass" };

/**
 * What an operator sees when they sign in: who Bluepass thinks they are, what it is showing
 * travellers on their behalf, and what it owes them.
 *
 * The gate runs again here rather than being inherited from the layout. It costs one query and it
 * is what makes this page safe to link to directly, independent of whatever the layout did.
 */
export default async function OperatorDashboardPage() {
  const { profile } = await requireOperatorOrRedirect("/operator");

  /* Independent loads. The listings come from this app's own database and the ledger from Kai
     across the network, so a Kai that is down must not take the rest of the page with it —
     `loadOperatorBookings` captures its own failure rather than throwing. */
  const [listings, bookings] = await Promise.all([
    loadOperatorListings(profile.id),
    loadOperatorBookings(profile),
  ]);

  return (
    <>
      <AdminPageHeader
        eyebrow="Your account"
        title={profile.companyName ?? "Your operator dashboard"}
        support="Everything Bluepass holds for you in one place — your profile and payout setup, your listing, and the bookings and payouts behind them."
      />

      <OperatorProfileSummary profile={profile} />
      <OperatorListings listings={listings} />
      <OperatorBookings bookings={bookings} />
    </>
  );
}
