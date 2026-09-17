"use client";

import { useActionState, useEffect, useState } from "react";
import {
  declinePartnerPayoutRequestAction,
  markPartnerPayoutPaidAction,
  revealPartnerPayoutDetailsAction,
  type PayoutActionState,
  type RevealPartnerPayoutState,
} from "@/app/admin/payouts/actions";
import Notice from "@/components/auth/Notice";
import Button from "@/components/ui/Button";
import { formatDateTime, formatMoneyFromCents } from "@/lib/services/admin/payouts";
import type { PartnerPayoutRequestRow } from "@/lib/services/admin/partner-payouts";

const IDLE: PayoutActionState = { status: "idle" };
const REVEAL_IDLE: RevealPartnerPayoutState = { status: "idle" };

/**
 * The referral/partner commission counterpart to PayoutActions.tsx - same two-step "arm, then
 * confirm the amount" posture for the irreversible actions, since this also sends real money out
 * that this console can't pull back. The one addition is "reveal bank details": unlike
 * OperatorProfile's write-only convention, a payout request an admin can never read the destination
 * for isn't usable, so this is scoped to one pending request at a time and re-checks admin status
 * on every call (see revealPartnerPayoutDetailsAction).
 */
export default function PartnerPayoutRequests({ requests }: { requests: PartnerPayoutRequestRow[] }) {
  return (
    <section className="adm-block">
      <header className="adm-block__head">
        <h2 className="ds-headline adm-block__title">Partner payout requests</h2>
        <p className="ds-caption adm-block__note">
          A partner requested a cash-out of their accrued referral commission. Reveal their bank
          details, transfer manually, then mark it paid.
        </p>
      </header>

      {requests.length === 0 ? (
        <div className="adm-card adm-empty">
          <p className="ds-body-sm adm-empty__body">No partner payout requests are waiting.</p>
        </div>
      ) : (
        <div className="adm-ledger">
          {requests.map((request) => (
            <PartnerPayoutRequestCard key={request.id} request={request} />
          ))}
        </div>
      )}
    </section>
  );
}

function PartnerPayoutRequestCard({ request }: { request: PartnerPayoutRequestRow }) {
  const amount = formatMoneyFromCents(request.amountCents, request.currency);

  return (
    <article className="adm-card adm-ledger__row">
      <header className="adm-ledger__head">
        <div className="adm-ledger__ident">
          <h3 className="ds-body-lg adm-ledger__title">{request.partnerName}</h3>
          <span className="ds-micro adm-ledger__kind">
            {request.contactEmail ?? "no email on file"}
            {request.contactPhone ? ` · ${request.contactPhone}` : ""}
          </span>
        </div>
        <div className="adm-ledger__money">
          <span className="ds-headline adm-ledger__amount">{amount}</span>
        </div>
      </header>

      <footer className="adm-ledger__foot">
        <span className="ds-micro adm-ledger__created">Requested {formatDateTime(request.createdAt)}</span>
      </footer>

      <RevealBankDetails referralPartnerId={request.referralPartnerId} />
      <div className="adm-payact__row">
        <MarkPaid requestId={request.id} amount={amount} />
        <DeclineRequest requestId={request.id} />
      </div>
    </article>
  );
}

function RevealBankDetails({ referralPartnerId }: { referralPartnerId: string }) {
  const [state, formAction, pending] = useActionState(revealPartnerPayoutDetailsAction, REVEAL_IDLE);

  if (state.status === "revealed") {
    return (
      <div className="adm-payact">
        <pre className="adm-textarea ds-body-sm">{state.bankDetails}</pre>
      </div>
    );
  }

  return (
    <div className="adm-payact">
      <form action={formAction}>
        <input type="hidden" name="referralPartnerId" value={referralPartnerId} />
        <Button type="submit" variant="secondary" magnetic={false} disabled={pending}>
          {pending ? "Revealing…" : "Reveal bank details"}
        </Button>
      </form>
      {state.status === "error" ? <Notice tone="error">{state.message}</Notice> : null}
    </div>
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

function MarkPaid({ requestId, amount }: { requestId: string; amount: string }) {
  const [state, formAction, pending] = useActionState(markPartnerPayoutPaidAction, IDLE);
  const [armed, setArmed] = useArmed(state);
  const [reference, setReference] = useState("");

  return (
    <div className="adm-payact">
      {armed ? (
        <form action={formAction} className="adm-payact__form">
          <input type="hidden" name="requestId" value={requestId} />
          <label className="adm-payact__field">
            <span className="ds-micro afield__label">Reference (optional)</span>
            <span className="afield__well">
              <input
                name="reference"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                placeholder="Bank transfer reference"
                autoComplete="off"
                className="afield__input"
                disabled={pending}
              />
            </span>
          </label>
          <div className="adm-payact__row">
            <Button type="submit" variant="primary" magnetic={false} disabled={pending}>
              {pending ? "Marking…" : `Mark ${amount} paid`}
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
        </form>
      ) : (
        <Button type="button" variant="primary" magnetic={false} onClick={() => setArmed(true)}>
          Mark as paid
        </Button>
      )}
      {state.status === "error" ? <Notice tone="error">{state.message}</Notice> : null}
      {state.status === "done" ? <Notice tone="success">{state.message}</Notice> : null}
    </div>
  );
}

function DeclineRequest({ requestId }: { requestId: string }) {
  const [state, formAction, pending] = useActionState(declinePartnerPayoutRequestAction, IDLE);
  const [armed, setArmed] = useArmed(state);
  const [reason, setReason] = useState("");

  return (
    <div className="adm-payact">
      {armed ? (
        <form action={formAction} className="adm-payact__form">
          <input type="hidden" name="requestId" value={requestId} />
          <label className="adm-payact__field">
            <span className="ds-micro afield__label">Reason</span>
            <span className="afield__well">
              <input
                name="reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Why this request is being declined"
                autoComplete="off"
                className="afield__input"
                disabled={pending}
              />
            </span>
          </label>
          <div className="adm-payact__row">
            <Button type="submit" variant="secondary" magnetic={false} disabled={pending}>
              {pending ? "Declining…" : "Confirm decline"}
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
        </form>
      ) : (
        <Button type="button" variant="secondary" magnetic={false} onClick={() => setArmed(true)}>
          Decline
        </Button>
      )}
      {state.status === "error" ? <Notice tone="error">{state.message}</Notice> : null}
    </div>
  );
}
