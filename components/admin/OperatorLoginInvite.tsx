"use client";

import { useActionState } from "react";
import Notice from "@/components/auth/Notice";
import Button from "@/components/ui/Button";
import {
  sendOperatorLoginInviteAction,
  type OperatorLoginInviteState,
} from "@/app/admin/operators/actions";

const IDLE: OperatorLoginInviteState = { status: "idle" };

/**
 * "Send login invite", wherever an operator profile is on screen.
 *
 * Re-sendable on purpose: a link expires in an hour and an operator will often come back days
 * later saying they never got it. Each send simply mints a fresh token and invalidates the rest,
 * which is the existing reset flow's behaviour, so pressing it twice is safe.
 */
export default function OperatorLoginInvite({
  operatorProfileId,
  email,
}: {
  operatorProfileId: string;
  email?: string;
}) {
  const [state, formAction, pending] = useActionState(sendOperatorLoginInviteAction, IDLE);

  return (
    <div className="adm-invite">
      <form action={formAction} className="adm-invite__form">
        <input type="hidden" name="operatorProfileId" value={operatorProfileId} />
        <Button type="submit" variant="secondary" magnetic={false} disabled={pending}>
          {pending
            ? "Sending…"
            : state.status === "sent"
              ? "Send the invite again"
              : "Send login invite"}
        </Button>
        <span className="ds-micro adm-invite__note">
          Emails {email ? <strong>{email}</strong> : "the operator"} a link to set their password and
          sign in at /operator. The link expires in an hour; sending again replaces it.
        </span>
      </form>

      {state.status === "error" ? <Notice tone="error">{state.message}</Notice> : null}

      {state.status === "sent" ? (
        <Notice tone="success">
          Invite sent to {state.email}.
          {state.developmentResetUrl ? (
            <>
              {" "}
              No mail provider is configured here, so nothing was actually delivered — open{" "}
              <a href={state.developmentResetUrl} className="adm-invite__devlink">
                this link
              </a>{" "}
              to finish the flow yourself.
            </>
          ) : null}
        </Notice>
      ) : null}
    </div>
  );
}
