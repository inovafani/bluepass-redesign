import { formatMoneyFromCents } from "@/lib/services/admin/payouts";
import type { AdminOverviewStats } from "@/lib/services/admin/overview";

/**
 * The real numbers behind the admin door — every FINALIZED ledger line Kai holds, folded to one row
 * per currency, plus the two headcounts this app already owns. Nothing here is estimated: a Kai
 * that can't be reached says so instead of quietly showing zero revenue.
 *
 * Australia only for now (2026-08-19) - Indonesia's ledger is fully test-data-polluted (see
 * foldMoneyByCurrency's note in overview.ts); showing it here would be a fabricated number on an
 * investor-facing page.
 */
export default function OverviewStats({ stats }: { stats: AdminOverviewStats }) {
  return (
    <section className="adm-block">
      <header className="adm-block__head">
        <h2 className="ds-headline adm-block__title">Where things stand</h2>
        <p className="ds-caption adm-block__note">
          Australia bookings Kai has settled. Indonesia isn't shown yet — its ledger needs a
          data-hygiene pass first.
        </p>
      </header>

      <div className="ovr-counts">
        <div className="ovr-count">
          <span className="ds-display-md ovr-count__value">{stats.bookingCount}</span>
          <span className="ds-micro ovr-count__label">AU bookings settled</span>
        </div>
        <div className="ovr-count">
          <span className="ds-display-md ovr-count__value">{stats.liveOperatorCount}</span>
          <span className="ds-micro ovr-count__label">live operators</span>
        </div>
        <div className="ovr-count">
          <span className="ds-display-md ovr-count__value">{stats.approvedCreatorCount}</span>
          <span className="ds-micro ovr-count__label">approved creators</span>
        </div>
      </div>

      {!stats.kaiStats.ok ? (
        <div className="adm-card">
          <p className="ds-body-sm">Kai is unreachable right now — money totals can't be shown.</p>
          <p className="ds-micro adm-list__note">{stats.kaiStats.message}</p>
        </div>
      ) : stats.moneyByCurrency.length === 0 ? (
        <div className="adm-card">
          <p className="ds-body-sm crt-empty">No finalised bookings yet.</p>
        </div>
      ) : (
        <div className="ovr-money-grid">
          {stats.moneyByCurrency.map((row) => (
            <div key={row.currency} className="adm-card ovr-money-card">
              <span className="ds-micro ovr-money-card__currency">{row.currency}</span>
              <dl className="adm-facts">
                <div className="adm-facts__row">
                  <dt className="ds-micro adm-facts__label">To the reef (conservation)</dt>
                  <dd className="ds-body-sm adm-facts__value">
                    {formatMoneyFromCents(row.conservationCents, row.currency)}
                  </dd>
                </div>
                <div className="adm-facts__row">
                  <dt className="ds-micro adm-facts__label">To operators</dt>
                  <dd className="ds-body-sm adm-facts__value">
                    {formatMoneyFromCents(row.operatorPayoutCents, row.currency)}
                  </dd>
                </div>
                <div className="adm-facts__row">
                  <dt className="ds-micro adm-facts__label">Platform commission</dt>
                  <dd className="ds-body-sm adm-facts__value">
                    {formatMoneyFromCents(row.platformCommissionCents, row.currency)}
                  </dd>
                </div>
                {row.creatorCommissionCents > 0 ? (
                  <div className="adm-facts__row">
                    <dt className="ds-micro adm-facts__label">Creator/partner commission</dt>
                    <dd className="ds-body-sm adm-facts__value">
                      {formatMoneyFromCents(row.creatorCommissionCents, row.currency)}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
