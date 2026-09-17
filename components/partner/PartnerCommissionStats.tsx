"use client";

import { useActionState } from "react";
import { requestPayoutAction, type PayoutRequestState } from "@/app/partner-portal/actions";
import Notice from "@/components/auth/Notice";
import Button from "@/components/ui/Button";
import { formatDateTime, formatMoneyFromCents, humaniseLedgerKind } from "@/lib/services/admin/payouts";
import type { PartnerCommissionSummary } from "@/lib/services/partner/dashboard";
import type { PartnerPayoutBalance } from "@/lib/services/partner/payout-requests";

const IDLE: PayoutRequestState = { status: "idle" };

/** What this partner has earned so far, and the individual bookings behind it — both regions. */
export default function PartnerCommissionStats({
  summary,
  balances,
}: {
  summary: PartnerCommissionSummary;
  balances: PartnerPayoutBalance[];
}) {
  const currencies = Object.keys(summary.totalCentsByCurrency);
  const balanceByCurrency = new Map(balances.map((balance) => [balance.currency, balance]));

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
          <p className="ds-body-sm ptr-empty">
            Nothing yet — this fills in the first time someone books through your link.
          </p>
        ) : (
          <div className="ptr-totals">
            {currencies.map((currency) => (
              <div key={currency} className="ptr-totals__item">
                <span className="ds-display-md ptr-totals__amount">
                  {formatMoneyFromCents(summary.totalCentsByCurrency[currency], currency)}
                </span>
                <span className="ds-micro ptr-totals__label">total, {currency}</span>
              </div>
            ))}
          </div>
        )}

        {currencies.map((currency) => {
          const balance = balanceByCurrency.get(currency);
          if (!balance) return null;
          return <PayoutRequestRow key={currency} balance={balance} />;
        })}

        {summary.entries.length > 0 ? (
          <ul className="adm-list ptr-entries">
            {summary.entries.map((entry) => (
              <li key={entry.id} className="ptr-entry-row">
                <span className="ds-body-sm ptr-entry-row__kind">
                  {entry.label ?? humaniseLedgerKind(entry.kind)}
                </span>
                <span className="ds-micro ptr-entry-row__meta">
                  {formatDateTime(entry.createdAt)} · {entry.status.toLowerCase()}
                </span>
                <span className="ds-body-sm ptr-entry-row__amount">
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

/** One currency's "request payout" affordance: a button once available crosses the threshold, a
 * pending note while a request is awaiting a decision, or how much more is needed otherwise. */
function PayoutRequestRow({ balance }: { balance: PartnerPayoutBalance }) {
  const [state, formAction, pending] = useActionState(requestPayoutAction, IDLE);

  if (balance.pendingRequestedAt) {
    return (
      <p className="ds-body-sm ptr-payout-row">
        {formatMoneyFromCents(balance.availableCents, balance.currency)} requested on{" "}
        {formatDateTime(balance.pendingRequestedAt)} — Bluepass will be in touch once it's sent.
      </p>
    );
  }

  return (
    <form action={formAction} className="ptr-payout-row">
      <input type="hidden" name="currency" value={balance.currency} />
      {state.status === "error" ? <Notice tone="error">{state.message}</Notice> : null}
      {state.status === "done" ? <Notice tone="success">{state.message}</Notice> : null}

      {balance.canRequest ? (
        <Button type="submit" variant="secondary" magnetic={false} disabled={pending}>
          {pending
            ? "Requesting…"
            : `Request payout · ${formatMoneyFromCents(balance.availableCents, balance.currency)}`}
        </Button>
      ) : (
        <span className="ds-micro ptr-payout-row__note">
          {formatMoneyFromCents(balance.availableCents, balance.currency)} available in {balance.currency} — keep
          earning to unlock a payout request.
        </span>
      )}
    </form>
  );
}
