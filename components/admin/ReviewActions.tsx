"use client";

import { useActionState, useEffect, useState } from "react";
import Notice from "@/components/auth/Notice";
import Button from "@/components/ui/Button";
import {
  approveReviewAction,
  declineReviewAction,
  type ReviewActionState,
} from "@/app/admin/approvals/actions";
import type { ApprovalKind } from "@/lib/services/admin/review-queue";

const IDLE: ReviewActionState = { status: "idle" };

/**
 * The Approve / Decline pair on a queue row.
 *
 * Two forms, not one with two submit buttons: `useActionState` does not pass
 * the submitter through, so the pressed button's identity cannot be recovered
 * server-side (see the note in actions.ts). Each form posts to an action that
 * already knows which decision it is.
 *
 * Decline is armed before it fires. Approving is recoverable — an operator
 * approved by mistake can be reviewed again — but there is no un-decline
 * surface anywhere in this console, so a misclick on a row a colleague spent a
 * week chasing is final. One deliberate second click is worth that.
 */
export default function ReviewActions({
  kind,
  id,
  subject,
}: {
  kind: ApprovalKind;
  id: string;
  subject: string;
}) {
  const [approveState, approveAction, approving] = useActionState(approveReviewAction, IDLE);
  const [declineState, declineAction, declining] = useActionState(declineReviewAction, IDLE);
  const [armed, setArmed] = useState(false);

  const pending = approving || declining;
  const state = approveState.status !== "idle" ? approveState : declineState;

  /* A failed decline leaves the row on screen; disarm so the next click has to
     be deliberate again rather than resubmitting on top of an error. */
  useEffect(() => {
    if (declineState.status === "error") {
      setArmed(false);
    }
  }, [declineState.status]);

  const identity = (
    <>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
    </>
  );

  return (
    <div className="adm-decide">
      <div className="adm-decide__row">
        <form action={approveAction}>
          {identity}
          <Button type="submit" variant="primary" magnetic={false} disabled={pending}>
            {approving ? "Saving…" : "Approve"}
          </Button>
        </form>

        {armed ? (
          <form action={declineAction} className="adm-decide__row">
            {identity}
            <Button
              type="submit"
              variant="secondary"
              magnetic={false}
              disabled={pending}
              className="btn--danger"
            >
              {declining ? "Saving…" : "Confirm decline"}
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
          <Button
            type="button"
            variant="secondary"
            magnetic={false}
            disabled={pending}
            onClick={() => setArmed(true)}
          >
            Decline
          </Button>
        )}
      </div>

      {armed ? (
        <p className="ds-micro adm-decide__warn">
          Declining {subject} cannot be undone from this console.
        </p>
      ) : null}

      {state.status === "error" ? <Notice tone="error">{state.message}</Notice> : null}
      {state.status === "done" ? <Notice tone="success">{state.message}</Notice> : null}
    </div>
  );
}
