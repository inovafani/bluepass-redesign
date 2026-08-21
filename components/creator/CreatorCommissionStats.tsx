import { formatDateTime, formatMoneyFromCents, humaniseLedgerKind } from "@/lib/services/admin/payouts";
import type { CreatorCommissionSummary } from "@/lib/services/creator/dashboard";

/** What this creator has earned so far, and the individual bookings behind it — both regions. */
export default function CreatorCommissionStats({ summary }: { summary: CreatorCommissionSummary }) {
  const currencies = Object.keys(summary.totalCentsByCurrency);

  return (
    <section className="adm-block">
      <header className="adm-block__head">
        <h2 className="ds-headline adm-block__title">What you've earned</h2>
        <p className="ds-caption adm-block__note">
          Every booking made through your link, Indonesia and Australia both.
        </p>
      </header>

      <div className="adm-card">
        {currencies.length === 0 ? (
          <p className="ds-body-sm crt-empty">
            Nothing yet — this fills in the first time someone books through your link.
          </p>
        ) : (
          <div className="crt-totals">
            {currencies.map((currency) => (
              <div key={currency} className="crt-totals__item">
                <span className="ds-display-md crt-totals__amount">
                  {formatMoneyFromCents(summary.totalCentsByCurrency[currency], currency)}
                </span>
                <span className="ds-micro crt-totals__label">total, {currency}</span>
              </div>
            ))}
          </div>
        )}

        {summary.entries.length > 0 ? (
          <ul className="adm-list crt-entries">
            {summary.entries.map((entry) => (
              <li key={entry.id} className="crt-entry-row">
                <span className="ds-body-sm crt-entry-row__kind">
                  {entry.label ?? humaniseLedgerKind(entry.kind)}
                </span>
                <span className="ds-micro crt-entry-row__meta">
                  {formatDateTime(entry.createdAt)} · {entry.status.toLowerCase()}
                </span>
                <span className="ds-body-sm crt-entry-row__amount">
                  {formatMoneyFromCents(entry.amountCents, entry.currency)}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
