import SectionError from "@/components/admin/SectionError";
import StatusPill, { ledgerTone } from "@/components/admin/StatusPill";
import {
  formatDateTime,
  formatMoneyFromCents,
  humaniseLedgerKind,
  OPERATOR_PAYOUT_KIND,
  type LedgerRowView,
} from "@/lib/services/admin/payouts";
import type { OperatorBookings as OperatorBookingsData } from "@/lib/services/operator/dashboard";

/**
 * Bookings and the money attached to them, with three genuinely different things to say.
 *
 * The two non-ledger branches are the reason this is not just a table. A Rezdy-Agent operator's
 * bookings are real and are simply not readable from here, and an unlinked operator has no booking
 * source at all — rendering either as an empty table would tell a working business that it has no
 * bookings, which is both false and exactly the kind of thing they would believe.
 */
export default function OperatorBookings({ bookings }: { bookings: OperatorBookingsData }) {
  return (
    <section className="adm-block">
      <header className="adm-block__head">
        <h2 className="ds-headline adm-block__title">Bookings &amp; payouts</h2>
        <p className="ds-caption adm-block__note">
          Every line Bluepass holds against your bookings, newest first — what is still pending and
          what has been finalised.
        </p>
      </header>

      <Body bookings={bookings} />
    </section>
  );
}

function Body({ bookings }: { bookings: OperatorBookingsData }) {
  if (bookings.kind === "rezdy-agent") {
    return (
      <div className="adm-card adm-empty">
        <p className="ds-body-sm adm-empty__title">
          Booking history isn&rsquo;t available for your account yet.
        </p>
        <p className="ds-body-sm adm-empty__body">
          Your bookings come through Rezdy (supplier {bookings.rezdySupplierId}), and Bluepass
          cannot yet read a single operator&rsquo;s history from that side — the reporting it exposes
          is per-region, not per-operator. This is a gap on our side, not a sign that you have no
          bookings. Rezdy remains the accurate record in the meantime.
        </p>
      </div>
    );
  }

  if (bookings.kind === "unlinked") {
    return (
      <div className="adm-card adm-empty">
        <p className="ds-body-sm adm-empty__title">Your account isn&rsquo;t linked to a booking source yet.</p>
        <p className="ds-body-sm adm-empty__body">
          Your profile and payout details are set up, but nothing is connected that would send
          bookings through Bluepass, so there is nothing to show here yet — again, not the same as
          having no bookings. Your Bluepass contact can tell you what connecting it involves.
        </p>
      </div>
    );
  }

  if (!bookings.result.ok) {
    return (
      <SectionError
        message={bookings.result.message}
        hint="Nothing is wrong with your bookings — Bluepass could not reach the system holding them. Try again shortly, and tell your Bluepass contact if it persists."
      />
    );
  }

  if (bookings.result.data.length === 0) {
    return (
      <div className="adm-card adm-empty">
        <p className="ds-body-sm adm-empty__title">No booking lines yet.</p>
        <p className="ds-body-sm adm-empty__body">
          Your account is connected and reachable — there is simply nothing recorded against it so
          far. Anything booked through Bluepass will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="adm-ledger">
      {bookings.result.data.map((row) => (
        <BookingRow key={row.id} row={row} />
      ))}
    </div>
  );
}

function BookingRow({ row }: { row: LedgerRowView }) {
  const isOperatorPayout = row.kind === OPERATOR_PAYOUT_KIND;

  return (
    <article className={`adm-card adm-ledger__row ${isOperatorPayout ? "is-payout" : ""}`}>
      <header className="adm-ledger__head">
        <div className="adm-ledger__ident">
          <h3 className="ds-body-lg adm-ledger__title">{row.title}</h3>
          <span className="ds-micro adm-ledger__kind">{humaniseLedgerKind(row.kind)}</span>
        </div>

        <div className="adm-ledger__money">
          <span className="ds-headline adm-ledger__amount">
            {formatMoneyFromCents(row.amountCents, row.currency)}
          </span>
          <div className="adm-ledger__pills">
            <StatusPill tone={ledgerTone(row.status)}>{row.status}</StatusPill>
          </div>
        </div>
      </header>

      {row.facts.length ? (
        <dl className="adm-facts">
          {row.facts.map((f) => (
            <div className="adm-facts__row" key={`${f.label}-${f.value}`}>
              <dt className="ds-micro adm-facts__label">{f.label}</dt>
              <dd className="ds-body-sm adm-facts__value">{f.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      <footer className="adm-ledger__foot">
        <span className="ds-micro adm-ledger__created">Created {formatDateTime(row.createdAt)}</span>
      </footer>
    </article>
  );
}
