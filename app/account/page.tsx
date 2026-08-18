import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import TripList from "@/components/account/TripList";
import { requireSignedInOrRedirect } from "@/lib/services/account/guard";
import { loadTravellerTrips } from "@/lib/services/account/traveller-bookings";

export const metadata: Metadata = {
  title: "Your trips | Bluepass",
  robots: { index: false, follow: false },
};

/* One traveller's own rows, never cacheable across visitors. */
export const dynamic = "force-dynamic";

/**
 * The traveller's own area — the first surface in this repo that belongs to the person doing the
 * booking rather than to staff or to an operator.
 *
 * Unlike `/admin` and `/operator` this is not a console: it keeps the site's own chrome, nav and
 * footer included, because a traveller checking their trips is still on bluepass.co and should not
 * feel handed off to an internal tool.
 *
 * The account id comes from the session and is passed straight to Kai. It is never read from a
 * query parameter, which is the only reason a service-to-service admin token is safe to use behind
 * this page: this app has already proved who is asking.
 */
export default async function AccountPage() {
  const traveller = await requireSignedInOrRedirect("/account");
  const trips = await loadTravellerTrips(traveller.accountId);

  return (
    <main className="acctpage">
      <div className="acctpage__inner">
        <header className="acctpage__head">
          <span className="ds-micro acctpage__eyebrow">Your account</span>
          <h1 className="ds-display-md acctpage__title">Your trips</h1>
          <p className="ds-body acctpage__support">
            Everything you have booked or enquired about through Bluepass, newest first — wherever in
            the world it was.
          </p>
        </header>

        {!trips.ok ? (
          /* Distinct from "you have no trips", and deliberately so: an unreachable Kai must never
             be rendered as an empty history to someone who has really booked. */
          <div className="acctpage__panel acctpage__panel--fault" role="alert">
            <p className="ds-body-sm acctpage__fault-title">
              We couldn&rsquo;t load your trips just now.
            </p>
            <p className="ds-caption acctpage__fault-body">
              This is a problem on our side, not a sign that anything is wrong with your bookings.
              Please try again in a moment — if it keeps happening, get in touch and we will look it
              up for you.
            </p>
          </div>
        ) : trips.data.length === 0 ? (
          <div className="acctpage__panel">
            <p className="ds-body-lg acctpage__empty-title">No trips yet.</p>
            <p className="ds-body-sm acctpage__empty-body">
              Once you book or enquire through Bluepass, it will show up here — with the operator,
              the date, and what you paid.
            </p>
            <Link href="/discover" className="ds-body-sm acctpage__cta">
              Find something to do →
            </Link>
          </div>
        ) : (
          <TripList trips={trips.data} />
        )}
      </div>

      <SiteFooter />
    </main>
  );
}
