"use client";

import { useActionState, useEffect, useState } from "react";
import Notice from "@/components/auth/Notice";
import Button from "@/components/ui/Button";
import {
  releaseIndonesiaPayoutAction,
  settleAustraliaBookingAction,
  type PayoutActionState,
} from "@/app/admin/payouts/actions";
import type { LedgerRowView } from "@/lib/services/admin/payouts";

const IDLE: PayoutActionState = { status: "idle" };

/**
 * The manual override on a pending operator-payout line.
 *
 * Always armed before it fires, and unlike the approvals queue there is no one-click path at all:
 * every button here moves real money out to a real business, and none of it can be pulled back from
 * this console. The confirm step states the amount so the second click is made against the number,
 * not against a row position.
 *
 * Two separate actions rather than one with a discriminator, for the same reason the approvals queue
 * has two: `useActionState` does not pass the submitter through, so anything encoded on the button
 * is lost by the time the action runs.
 */
export default function PayoutActions({ row, amount }: { row: LedgerRowView; amount: string }) {
  if (!row.action) {
    return null;
  }

  return row.action.type === "au-settle" ? (
    <AustraliaSettle tenantSlug={row.tenantSlug} attemptId={row.action.attemptId} amount={amount} />
  ) : (
    <IndonesiaRelease tenantSlug={row.tenantSlug} entryId={row.action.entryId} amount={amount} />
  );
}

function useArmed(state: PayoutActionState) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (state.status === "error") {
      setArmed(false);
    }
  }, [state.status]);

  return [armed, setArmed] as const;
}

function AustraliaSettle({
  tenantSlug,
  attemptId,
  amount,
}: {
  tenantSlug: string;
  attemptId: string;
  amount: string;
}) {
  const [state, formAction, pending] = useActionState(settleAustraliaBookingAction, IDLE);
  const [armed, setArmed] = useArmed(state);

  return (
    <div className="adm-payact">
      {armed ? (
        <form action={formAction} className="adm-payact__row">
          <input type="hidden" name="tenantSlug" value={tenantSlug} />
          <input type="hidden" name="attemptId" value={attemptId} />
          <Button type="submit" variant="primary" magnetic={false} disabled={pending}>
            {pending ? "Releasing…" : `Release ${amount}`}
          </Button>
          <button
            type="button"
            className="alink-btn alink-btn--quiet ds-micro"
            onClick={() => setArmed(false)}
            disabled={pending}
          >
            Cancel
          </button>
        </form>
      ) : (
        <Button type="button" variant="secondary" magnetic={false} onClick={() => setArmed(true)}>
          Release payout
        </Button>
      )}

      {armed ? (
        <p className="ds-micro adm-payact__warn">
          Sends {amount} to the operator&rsquo;s Stripe Connect account and marks the booking settled.
          This cannot be undone from here.
        </p>
      ) : null}

      <ActionNotice state={state} />
    </div>
  );
}

function IndonesiaRelease({
  tenantSlug,
  entryId,
  amount,
}: {
  tenantSlug: string;
  entryId: string;
  amount: string;
}) {
  const [state, formAction, pending] = useActionState(releaseIndonesiaPayoutAction, IDLE);
  const [armed, setArmed] = useArmed(state);
  const [accountId, setAccountId] = useState("");

  return (
    <div className="adm-payact">
      {armed ? (
        <form action={formAction} className="adm-payact__form">
          <input type="hidden" name="tenantSlug" value={tenantSlug} />
          <input type="hidden" name="entryId" value={entryId} />
          <label className="adm-payact__field">
            <span className="ds-micro afield__label">Stripe Connect account</span>
            <span className="afield__well">
              <input
                name="stripeConnectAccountId"
                value={accountId}
                onChange={(event) => setAccountId(event.target.value)}
                placeholder="acct_1234567890"
                autoComplete="off"
                className="afield__input"
                disabled={pending}
              />
            </span>
          </label>
          <div className="adm-payact__row">
            <Button
              type="submit"
              variant="primary"
              magnetic={false}
              disabled={pending || !accountId.trim()}
            >
              {pending ? "Releasing…" : `Release ${amount}`}
            </Button>
            <button
              type="button"
              className="alink-btn alink-btn--quiet ds-micro"
              onClick={() => setArmed(false)}
              disabled={pending}
            >
              Cancel
            </button>
          </div>
          <p className="ds-micro adm-payact__warn">
            Sends {amount} to this account via Stripe. Check it against the operator&rsquo;s profile
            first — this cannot be undone from here.
          </p>
        </form>
      ) : (
        <Button type="button" variant="secondary" magnetic={false} onClick={() => setArmed(true)}>
          Release payout
        </Button>
      )}

      <ActionNotice state={state} />
    </div>
  );
}

function ActionNotice({ state }: { state: PayoutActionState }) {
  if (state.status === "error") {
    return <Notice tone="error">{state.message}</Notice>;
  }
  if (state.status === "done") {
    return <Notice tone="success">{state.message}</Notice>;
  }
  return null;
}
