import SectionError from "@/components/admin/SectionError";
import StatusPill, { ledgerTone, manualInquiryTone } from "@/components/admin/StatusPill";
import {
  formatDateTime,
  formatMoneyFromCents,
  humaniseLedgerKind,
  OPERATOR_PAYOUT_KIND,
  type LedgerRowView,
} from "@/lib/services/admin/payouts";
import type { RezdyAgentManualInquiry } from "@/lib/services/discover/rezdy-agent-sync";
import type { OperatorBookings as OperatorBookingsData } from "@/lib/services/operator/dashboard";

/**
 * Bookings and the money attached to them, with genuinely different things to say depending on
 * where an operator's bookings actually come from.
 *
 * The unlinked branch is why this is not just a table: an operator with no booking source at all
 * has nothing to show, and rendering that as an empty table would tell a working business it has no
 * bookings — false, and exactly the kind of thing they would believe.
 */
export default function OperatorBookings({ bookings }: { bookings: OperatorBookingsData }) {
  return (
    <section className="adm-block">
      <header className="adm-block__head">
        <h2 className="ds-headline adm-block__title">Bookings &amp; payouts</h2>
        <p className="ds-caption adm-block__note">
          {bookings.kind === "rezdy-agent"
            ? "Trip enquiries Bluepass has passed along on your behalf, newest first — these come through as enquiries today, not paid bookings."
            : "Every line Bluepass holds against your bookings, newest first — what is still pending and what has been finalised."}
        </p>
      </header>

      <Body bookings={bookings} />
    </section>
  );
}

function Body({ bookings }: { bookings: OperatorBookingsData }) {
  if (bookings.kind === "rezdy-agent") {
    if (!bookings.result.ok) {
      return (
        <SectionError
          message={bookings.result.message}
          hint="Nothing is wrong with your enquiries — Bluepass could not reach the system holding them. Try again shortly, and tell your Bluepass contact if it persists."
        />
      );
    }

    if (bookings.result.data.length === 0) {
      return (
        <div className="adm-card adm-empty">
          <p className="ds-body-sm adm-empty__title">No enquiries yet.</p>
          <p className="ds-body-sm adm-empty__body">
            Your account is connected (supplier {bookings.rezdySupplierId}) and reachable — there is
            simply nothing recorded against it so far. A traveller enquiry made through Bluepass will
            appear here.
          </p>
        </div>
      );
    }

    return (
      <div className="adm-ledger">
        {bookings.result.data.map((inquiry) => (
          <InquiryRow key={inquiry.id} inquiry={inquiry} />
        ))}
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

function InquiryRow({ inquiry }: { inquiry: RezdyAgentManualInquiry }) {
  const contactFacts = [
    inquiry.travellerName ? { label: "Traveller", value: inquiry.travellerName } : null,
    inquiry.travellerEmail ? { label: "Email", value: inquiry.travellerEmail } : null,
    inquiry.travellerPhone ? { label: "Phone", value: inquiry.travellerPhone } : null,
    inquiry.dateText ? { label: "Requested date", value: inquiry.dateText } : null,
    inquiry.guests != null ? { label: "Guests", value: String(inquiry.guests) } : null,
  ].filter((fact): fact is { label: string; value: string } => fact !== null);

  return (
    <article className="adm-card adm-ledger__row">
      <header className="adm-ledger__head">
        <div className="adm-ledger__ident">
          <h3 className="ds-body-lg adm-ledger__title">{inquiry.productTitle ?? "Untitled trip"}</h3>
          <span className="ds-micro adm-ledger__kind">Enquiry</span>
        </div>

        <div className="adm-ledger__pills">
          <StatusPill tone={manualInquiryTone(inquiry.status)}>{inquiry.status}</StatusPill>
        </div>
      </header>

      {contactFacts.length ? (
        <dl className="adm-facts">
          {contactFacts.map((f) => (
            <div className="adm-facts__row" key={`${f.label}-${f.value}`}>
              <dt className="ds-micro adm-facts__label">{f.label}</dt>
              <dd className="ds-body-sm adm-facts__value">{f.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      <p className="ds-body-sm adm-empty__body">{inquiry.travellerMessage}</p>

      <footer className="adm-ledger__foot">
        <span className="ds-micro adm-ledger__created">Created {formatDateTime(inquiry.createdAt)}</span>
      </footer>
    </article>
  );
}
