"use client";

import { useActionState, useState } from "react";
import { adminCancelBookingAction } from "@/app/admin/bookings/actions";
import ActionNotice from "@/components/rails/ActionNotice";
import PendingButton from "@/components/rails/PendingButton";
import type { RailsActionState } from "@/app/operator/rails-actions";

const IDLE: RailsActionState = { status: "idle" };

/** Cancel and refund one booking. Two steps (open, then tick and confirm) because it moves real money. */
export default function AdminCancelBooking({ bookingId, reference, refundText }: { bookingId: string; reference: string; refundText: string }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(adminCancelBookingAction.bind(null, bookingId), IDLE);

  if (state.status === "done") return <ActionNotice state={state} />;
  if (!open) {
    return (
      <button type="button" className="rl-btn rl-btn--secondary rl-btn--danger" onClick={() => setOpen(true)}>
        Cancel and refund…
      </button>
    );
  }
  return (
    <form action={action} className="rl-form">
      <p className="ds-body-sm">{refundText} The guest is emailed and the seats go back on sale.</p>
      <label className="rl-field">
        <span className="ds-micro rl-field__label">Reason the guest will see</span>
        <input name="reason" placeholder="The operator cannot run this trip" maxLength={300} required className="rl-input" />
      </label>
      <label className="rl-switch">
        <input type="checkbox" name="confirm" />
        <span className="ds-body-sm">Yes, cancel {reference}</span>
      </label>
      <ActionNotice state={state} />
      <div className="rl-actions">
        <PendingButton danger pending="Cancelling…">Cancel and refund</PendingButton>
        <button type="button" className="rl-btn rl-btn--quiet" onClick={() => setOpen(false)}>Keep it</button>
      </div>
    </form>
  );
}
