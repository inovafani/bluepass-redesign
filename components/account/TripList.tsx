import { formatDateTime } from "@/lib/services/admin/payouts";
import type { TravellerTrip } from "@/lib/services/account/traveller-bookings";

/**
 * Status vocabulary for a traveller, not for staff.
 *
 * The admin console's `StatusPill` is deliberately not reused here: its tones are tuned for someone
 * scanning for problems, where amber means "a human needs to act". A traveller seeing amber against
 * their own confirmed holiday reads it as something being wrong with *their* booking. These map the
 * same underlying statuses to what they mean for the person who booked.
 */
const STATUS_COPY: Record<string, { label: string; tone: string }> = {
  AWAITING_PAYMENT: { label: "Awaiting payment", tone: "wait" },
  PAYMENT_PENDING: { label: "Payment processing", tone: "wait" },
  CONFIRMED: { label: "Confirmed", tone: "good" },
  SETTLED: { label: "Confirmed", tone: "good" },
  CANCELLED: { label: "Cancelled", tone: "off" },
  FAILED: { label: "Payment failed", tone: "bad" },
  NEW: { label: "Enquiry sent", tone: "wait" },
  IN_PROGRESS: { label: "Being arranged", tone: "wait" },
  QUOTED: { label: "Quote ready", tone: "good" },
};

function statusOf(trip: TravellerTrip) {
  const known = STATUS_COPY[trip.status.toUpperCase()];
  if (known) return known;

  /* An unmapped status is shown as-is rather than guessed at. Kai can add one at any time, and
     inventing a friendly label for a status we do not recognise would be putting words in its
     mouth — "REFUND_PENDING" rendered as "Confirmed" is the failure worth avoiding. */
  return { label: trip.status.replace(/_/g, " ").toLowerCase(), tone: "neutral" };
}

export default function TripList({ trips }: { trips: TravellerTrip[] }) {
  return (
    <ul className="trips">
      {trips.map((trip) => {
        const status = statusOf(trip);

        return (
          <li className="trips__item" key={`${trip.kind}-${trip.id}`}>
            <article className="trip">
              <header className="trip__head">
                <div className="trip__ident">
                  <h2 className="ds-body-lg trip__title">{trip.title}</h2>
                  {trip.operator ? (
                    <p className="ds-caption trip__operator">with {trip.operator}</p>
                  ) : null}
                </div>
                <span className={`ds-micro trip__status trip__status--${status.tone}`}>
                  {status.label}
                </span>
              </header>

              <dl className="trip__facts">
                {trip.dateText ? (
                  <div className="trip__fact">
                    <dt className="ds-micro trip__label">When</dt>
                    <dd className="ds-body-sm trip__value">{trip.dateText}</dd>
                  </div>
                ) : null}
                {trip.guests ? (
                  <div className="trip__fact">
                    <dt className="ds-micro trip__label">Guests</dt>
                    <dd className="ds-body-sm trip__value">{trip.guests}</dd>
                  </div>
                ) : null}
                {trip.amount ? (
                  <div className="trip__fact">
                    <dt className="ds-micro trip__label">Total</dt>
                    <dd className="ds-body-sm trip__value">{trip.amount}</dd>
                  </div>
                ) : null}
                {trip.reference ? (
                  <div className="trip__fact">
                    <dt className="ds-micro trip__label">Reference</dt>
                    <dd className="ds-body-sm trip__value">{trip.reference}</dd>
                  </div>
                ) : null}
              </dl>

              <footer className="trip__foot">
                <span className="ds-micro trip__when">Booked {formatDateTime(trip.createdAt)}</span>
                {/* An enquiry is not a booking, and saying so on the card is what stops someone
                    believing a seat is held for them when the conversation is still open. */}
                {trip.kind === "indonesia-inquiry" ? (
                  <span className="ds-micro trip__note">
                    An enquiry — your operator is arranging this with you directly.
                  </span>
                ) : null}
                {trip.cancelledAt ? (
                  <span className="ds-micro trip__note">
                    Cancelled {formatDateTime(trip.cancelledAt)}
                  </span>
                ) : null}
              </footer>
            </article>
          </li>
        );
      })}
    </ul>
  );
}
