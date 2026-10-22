import Link from "next/link";
import { formatMoneyFromCents } from "@/lib/services/admin/payouts";
import type { Traction } from "@/lib/services/admin/traction";

/**
 * Where Bluepass stands, in numbers that can be defended: counted from the live database, with the
 * team's own dummy accounts left out (a switch brings them back for a demo). An empty week is shown as
 * an empty week, never smoothed over.
 */
export default function TractionPanel({ traction }: { traction: Traction }) {
  const { operators, trips, bookings, pipeline, demand } = traction;
  const peak = Math.max(1, ...bookings.weekly.map((week) => week.count));
  const total = bookings.weekly.reduce((sum, week) => sum + week.count, 0);

  return (
    <section className="adm-block">
      <header className="adm-block__head">
        <h2 className="ds-headline adm-block__title">Traction</h2>
        <p className="ds-caption adm-block__note">
          Counted from the live database.{" "}
          {traction.includeTest ? "Test and placeholder accounts are included." : "Test and placeholder accounts are left out."}{" "}
          <Link href={traction.includeTest ? "/admin" : "/admin?test=1"}>{traction.includeTest ? "Leave them out" : "Include test data"}</Link>
        </p>
      </header>

      <div className="trc-grid">
        <Stat value={operators.live} label="Live operators" note={operators.waitingForApproval ? `${operators.waitingForApproval} waiting for approval` : "None waiting"} />
        <Stat value={trips.live} label="Live trips" note={`${trips.native} on Bluepass · ${trips.rezdy} Rezdy · ${trips.fareHarbor} FareHarbor`} />
        <Stat value={bookings.count} label="Bookings" note={`${bookings.throughBluepass} through Bluepass · ${bookings.enteredByOperators} entered by operators`} />
        <Stat value={bookings.guests} label="Guests booked" note="Across confirmed and requested bookings" />
        <Stat value={demand.travellerAccounts} label="Traveller accounts" note="Signed up on the site" />
        <Stat value={demand.waitlistTotal} label="On the waitlist" note={`${demand.waitlistTravellers} travellers · ${demand.waitlistOperators} operators · ${demand.waitlistPartners} partners`} />
      </div>

      {bookings.money.length > 0 ? (
        <div className="trc-money">
          {bookings.money.map((row) => (
            <div key={row.currency} className="adm-card trc-money__card">
              <span className="ds-micro trc-money__currency">{row.currency} booked</span>
              <dl className="adm-facts">
                <div className="adm-facts__row">
                  <dt className="ds-micro adm-facts__label">Through Bluepass</dt>
                  <dd className="ds-body-sm adm-facts__value">{formatMoneyFromCents(row.throughBluepassCents, row.currency)}</dd>
                </div>
                <div className="adm-facts__row">
                  <dt className="ds-micro adm-facts__label">Entered by operators</dt>
                  <dd className="ds-body-sm adm-facts__value">{formatMoneyFromCents(row.enteredByOperatorsCents, row.currency)}</dd>
                </div>
                <div className="adm-facts__row">
                  <dt className="ds-micro adm-facts__label">To the reef (5%)</dt>
                  <dd className="ds-body-sm adm-facts__value">{formatMoneyFromCents(row.conservationCents, row.currency)}</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      ) : null}

      <div className="adm-card trc-weeks">
        <div className="trc-weeks__head">
          <span className="ds-body-sm">Bookings by week</span>
          <span className="ds-micro trc-weeks__total">{total === 0 ? "None in the last 8 weeks" : `${total} in the last 8 weeks`}</span>
        </div>
        <ol className="trc-weeks__bars" aria-label="Bookings per week, oldest first">
          {bookings.weekly.map((week) => (
            <li key={week.weekStart} className="trc-week" title={`Week of ${week.weekStart}: ${week.count}`}>
              <span className="ds-micro trc-week__count">{week.count || ""}</span>
              <span className={`trc-week__bar${week.count === 0 ? " is-empty" : ""}`} style={{ height: `${Math.max(6, Math.round((week.count / peak) * 100))}%` }} />
              <span className="ds-micro trc-week__label">{week.weekStart.slice(5)}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="trc-pipeline">
        <span className="ds-micro trc-pipeline__label">Operator pipeline</span>
        <span className="ds-body-sm">
          <strong>{pipeline.leads}</strong> leads · <strong>{pipeline.pages}</strong> prepared pages ({pipeline.pagesApproved} checked) · <strong>{pipeline.claimed}</strong> claimed · <strong>{pipeline.live}</strong> live
        </span>
      </div>
    </section>
  );
}

function Stat({ value, label, note }: { value: number; label: string; note: string }) {
  return (
    <div className="adm-card trc-stat">
      <span className="ds-display-md trc-stat__value">{value.toLocaleString("en-AU")}</span>
      <span className="ds-body-sm trc-stat__label">{label}</span>
      <span className="ds-micro trc-stat__note">{note}</span>
    </div>
  );
}
