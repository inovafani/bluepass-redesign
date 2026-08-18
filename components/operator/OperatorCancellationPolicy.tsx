"use client";

import { useActionState, useState } from "react";
import Notice from "@/components/auth/Notice";
import Button from "@/components/ui/Button";
import {
  updateCancellationPolicyAction,
  type OperatorSettingsState,
} from "@/app/operator/actions";
import type { CancellationPolicyTier } from "@/lib/services/operators/operator-payout-account";

const IDLE: OperatorSettingsState = { status: "idle" };

type Row = { days: string; percent: string };

/**
 * The operator's own cancellation terms.
 *
 * Same frame as every other console form: one `.adm-form__section` card, no card nested inside it.
 * The units live in the field labels rather than in a help line under each row — repeating "days
 * before departure" and "% of what they paid" beneath every row was three sentences of chrome for
 * three numbers, and it was what made the rows read as cramped.
 *
 * Rows are held as strings rather than numbers so a half-typed or cleared field stays exactly as
 * typed; coercing on every keystroke turns an empty box into a 0 the operator did not write, and
 * `""` and `0` mean very different things in a refund table. The server does the coercion once,
 * where a blank becomes NaN and is rejected rather than silently becoming "0% refund".
 */
export default function OperatorCancellationPolicy({
  tiers,
  platformDefault,
  usingDefault,
}: {
  tiers: CancellationPolicyTier[];
  platformDefault: CancellationPolicyTier[];
  usingDefault: boolean;
}) {
  const [state, formAction, pending] = useActionState(updateCancellationPolicyAction, IDLE);
  const [rows, setRows] = useState<Row[]>(
    (tiers.length ? tiers : platformDefault).map((tier) => ({
      days: String(tier.minDaysBeforeDeparture),
      percent: String(tier.refundPercent),
    })),
  );

  const set = (index: number, key: keyof Row) => (value: string) =>
    setRows((current) => current.map((row, i) => (i === index ? { ...row, [key]: value } : row)));

  const addRow = () => setRows((current) => [...current, { days: "", percent: "" }]);
  const removeRow = (index: number) => setRows((current) => current.filter((_, i) => i !== index));

  return (
    <section className="adm-block">
      <header className="adm-block__head">
        <h2 className="ds-headline adm-block__title">Cancellation policy</h2>
        <p className="ds-caption adm-block__note">
          How much a traveller gets back when they cancel, by how much notice they gave. Bluepass
          calculates refunds from this table directly.
        </p>
      </header>

      <form action={formAction} className="adm-form">
        {usingDefault ? (
          <Notice tone="info">
            You have not set your own policy, so Bluepass is applying its default — shown below.
            These are real terms already applied to your bookings, not a blank form. Save to make
            them yours, or change them first.
          </Notice>
        ) : null}

        {state.status === "error" ? <Notice tone="error">{state.message}</Notice> : null}
        {state.status === "done" ? <Notice tone="success">{state.message}</Notice> : null}

        <section className="adm-form__section">
          <ul className="adm-tiers">
            {rows.map((row, index) => (
              /* Index as key: these rows have no id, and their identity genuinely is their
                 position — the list is ordered, and removing one is meant to shift the rest up. */
              <li className="adm-tiers__row" key={index}>
                <label className="afield adm-tiers__field">
                  <span className="afield__top">
                    <span className="ds-micro afield__label">Days before departure</span>
                  </span>
                  <span className="afield__well">
                    <input
                      name="minDaysBeforeDeparture"
                      value={row.days}
                      onChange={(event) => set(index, "days")(event.target.value)}
                      inputMode="numeric"
                      placeholder="14"
                      autoComplete="off"
                      disabled={pending}
                      className="afield__input"
                      aria-label={`Tier ${index + 1}: days before departure`}
                    />
                  </span>
                </label>

                <label className="afield adm-tiers__field">
                  <span className="afield__top">
                    <span className="ds-micro afield__label">Refund %</span>
                  </span>
                  <span className="afield__well">
                    <input
                      name="refundPercent"
                      value={row.percent}
                      onChange={(event) => set(index, "percent")(event.target.value)}
                      inputMode="numeric"
                      placeholder="100"
                      autoComplete="off"
                      disabled={pending}
                      className="afield__input"
                      aria-label={`Tier ${index + 1}: refund percent`}
                    />
                  </span>
                </label>

                <button
                  type="button"
                  className="alink-btn alink-btn--quiet ds-micro adm-tiers__remove"
                  onClick={() => removeRow(index)}
                  disabled={pending || rows.length === 1}
                  aria-label={`Remove tier ${index + 1}`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>

          <button type="button" className="alink-btn ds-body-sm" onClick={addRow} disabled={pending}>
            + Add a tier
          </button>

          <p className="ds-micro adm-form__help">
            List them from the most notice to the least. The last row has to be 0 days — that is the
            one covering a cancellation on the day, and without it Bluepass ignores the whole table
            and falls back to its default policy.
          </p>
        </section>

        <div className="adm-form__submit">
          <Button type="submit" variant="primary" large magnetic={false} disabled={pending}>
            {pending ? "Saving…" : "Save cancellation policy"}
          </Button>
        </div>
      </form>
    </section>
  );
}
