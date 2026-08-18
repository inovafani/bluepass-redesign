import StatusPill, { type PillTone } from "@/components/admin/StatusPill";
import { formatDateTime } from "@/lib/services/admin/payouts";
import type { OperatorListingRow } from "@/lib/services/operator/dashboard";

const LISTING_TONES: Record<string, PillTone> = {
  LIVE: "good",
  DRAFT: "warn",
  ARCHIVED: "muted",
};

/**
 * The operator's listings, read-only.
 *
 * Read-only is stated on the page rather than merely implied by the absence of an edit button — an
 * operator who assumes this page is where they change their price would otherwise wait for an
 * affordance that is not coming in this pass.
 */
export default function OperatorListings({ listings }: { listings: OperatorListingRow[] }) {
  return (
    <section className="adm-block">
      <header className="adm-block__head">
        <h2 className="ds-headline adm-block__title">Your listing</h2>
        <p className="ds-caption adm-block__note">
          What Bluepass is showing travellers on your behalf. Editing these from here is coming;
          for now, changes go through your Bluepass contact.
        </p>
      </header>

      {listings.length === 0 ? (
        <div className="adm-card adm-empty">
          <p className="ds-body-sm adm-empty__title">No listing yet.</p>
          <p className="ds-body-sm adm-empty__body">
            Nothing of yours is published on Bluepass at the moment. If you were expecting a listing
            here, your Bluepass contact can tell you where it is up to.
          </p>
        </div>
      ) : (
        <div className="adm-list">
          {listings.map((listing) => (
            <article className="adm-card adm-review" key={listing.id}>
              <header className="adm-review__head">
                <div className="adm-review__ident">
                  <h3 className="ds-body-lg adm-review__title">{listing.title}</h3>
                  <span className="ds-micro adm-ledger__kind">
                    {listing.category} · {listing.region}
                  </span>
                </div>
                <StatusPill tone={LISTING_TONES[listing.status] ?? "muted"}>
                  {listing.status}
                </StatusPill>
              </header>

              <dl className="adm-facts">
                <div className="adm-facts__row">
                  <dt className="ds-micro adm-facts__label">Price shown</dt>
                  {/* `priceSignal` is free text an operator or an import wrote, so it is shown
                      exactly as stored — inventing "From $0" for a listing that never had a price
                      would put a number on the page that nobody chose. */}
                  <dd className="ds-body-sm adm-facts__value">
                    {listing.priceSignal ?? "No price shown"}
                  </dd>
                </div>
                <div className="adm-facts__row">
                  <dt className="ds-micro adm-facts__label">Published</dt>
                  <dd className="ds-body-sm adm-facts__value">
                    {listing.publishedAt ? formatDateTime(listing.publishedAt) : "Not published"}
                  </dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
