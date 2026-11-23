"use client";

import { useActionState } from "react";
import { requestPayoutAction, type PayoutRequestState } from "@/app/partner-portal/actions";
import Notice from "@/components/auth/Notice";
import Button from "@/components/ui/Button";
import { formatDateTime, formatMoneyFromCents, humaniseLedgerKind } from "@/lib/services/admin/payouts";
import type { PartnerCommissionSummary } from "@/lib/services/partner/dashboard";
import type { PartnerPayoutBalance } from "@/lib/services/partner/payout-requests";

const IDLE: PayoutRequestState = { status: "idle" };

/** Two coins with a dollar sign, drawn large and faint in the card's top-right corner. The front coin is filled so it hides the one behind. */
function Coins() {
  return (
    <svg className="ptr-watermark ptr-watermark--money" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="41" cy="23" r="17" />
      <path d="M41 14v18M46 19.5c-1-2-3-3-5-3s-5 1.2-5 3.5 2.4 3 5 3.5 5 1.2 5 3.5-2.4 3.5-5 3.5-4.2-1-5-3" strokeWidth="1.6" />
      <circle className="ptr-watermark__fill" cx="26" cy="39" r="20" />
      <circle cx="26" cy="39" r="14.5" />
      <path d="M26 29v20M32 35c-1.2-2.6-3.4-3.6-6-3.6s-6 1.3-6 4.2 2.9 3.6 6 4.2 6 1.4 6 4.2-3.2 4.2-6 4.2-4.8-1.2-6-3.8" />
    </svg>
  );
}

/**
 * What this partner has earned and what they can take out, per currency: the total, how much is
 * ready to withdraw, how much is still waiting on a trip to happen, and the one next step.
 * The bookings behind the total are listed by PartnerCommissionEntries, further down the page.
 */
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
      <div className="adm-card ptr-earnings">
        <Coins />
        <header className="ptr-card__head">
          <h2 className="ds-headline adm-block__title">What you've earned</h2>
          <p className="ds-caption adm-block__note">Every booking made through your link, Indonesia and Australia both.</p>
        </header>

        {currencies.length === 0 ? (
          <div className="ptr-empty">
            <p className="ds-body-sm ptr-empty__title">Nothing earned yet</p>
            <p className="ds-caption">
              Your first commission appears here as soon as someone books through your link. Share it from the card next to this one.
            </p>
          </div>
        ) : (
          currencies.map((currency) => {
            const balance = balanceByCurrency.get(currency);
            return (
              <div key={currency} className="ptr-earn">
                <div className="ptr-earn__total">
                  <span className="ds-display-md ptr-earn__amount">
                    {formatMoneyFromCents(summary.totalCentsByCurrency[currency], currency)}
                  </span>
                  <span className="ds-micro ptr-earn__label">earned in total, {currency}</span>
                </div>
                {balance ? (
                  <>
                    <dl className="ptr-earn__split">
                      <div className="ptr-earn__stat">
                        <dt className="ds-micro">Ready to withdraw</dt>
                        <dd className="ds-body-sm ptr-earn__stat-amount">{formatMoneyFromCents(balance.availableCents, currency)}</dd>
                      </div>
                      <div className="ptr-earn__stat">
                        <dt className="ds-micro">On its way</dt>
                        <dd className="ds-body-sm ptr-earn__stat-amount">{formatMoneyFromCents(balance.heldCents, currency)}</dd>
                        <dd className="ds-micro ptr-earn__stat-note">Released a day after each referred trip</dd>
                      </div>
                    </dl>
                    <PayoutRequestRow balance={balance} />
                  </>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

/** The bookings behind the total, newest first. Renders nothing until there is one. */
export function PartnerCommissionEntries({ summary }: { summary: PartnerCommissionSummary }) {
  if (summary.entries.length === 0) return null;

  return (
    <section className="adm-block">
      <header className="adm-block__head">
        <h2 className="ds-headline adm-block__title">Recent commission</h2>
      </header>
      <div className="adm-card">
        <ul className="adm-list ptr-entries">
          {summary.entries.map((entry) => (
            <li key={entry.id} className="ptr-entry-row">
              <span className="ds-body-sm ptr-entry-row__kind">{entry.label ?? humaniseLedgerKind(entry.kind)}</span>
              <span className="ds-micro ptr-entry-row__meta">
                {formatDateTime(entry.createdAt)} · {entry.status.toLowerCase()}
              </span>
              <span className="ds-body-sm ptr-entry-row__amount">{formatMoneyFromCents(entry.amountCents, entry.currency)}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** One currency's next step: a button once the withdrawable balance reaches the minimum, a note
 * while a request is awaiting a decision, or how far away the minimum still is. */
function PayoutRequestRow({ balance }: { balance: PartnerPayoutBalance }) {
  const [state, formAction, pending] = useActionState(requestPayoutAction, IDLE);

  if (balance.pendingRequestedAt) {
    return (
      <p className="ds-body-sm ptr-payout-row">
        {formatMoneyFromCents(balance.availableCents, balance.currency)} requested on{" "}
        {formatDateTime(balance.pendingRequestedAt)}. Bluepass will send it by bank transfer and be in touch.
      </p>
    );
  }

  return (
    <form action={formAction} className="ptr-payout-row">
      <input type="hidden" name="currency" value={balance.currency} />
      {state.status === "error" ? <Notice tone="error">{state.message}</Notice> : null}
      {state.status === "done" ? <Notice tone="success">{state.message}</Notice> : null}

      {balance.canRequest ? (
        <Button type="submit" variant="primary" magnetic={false} disabled={pending}>
          {pending ? "Requesting…" : `Request payout · ${formatMoneyFromCents(balance.availableCents, balance.currency)}`}
        </Button>
      ) : (
        <span className="ds-micro ptr-payout-row__note">
          Payouts start from {formatMoneyFromCents(balance.minPayoutCents, balance.currency)}
          {balance.availableCents < balance.minPayoutCents
            ? `, you are ${formatMoneyFromCents(balance.minPayoutCents - balance.availableCents, balance.currency)} away.`
            : "."}
        </span>
      )}
    </form>
  );
}
