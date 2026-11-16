"use client";

import { useActionState, useState } from "react";
import ActionNotice from "@/components/rails/ActionNotice";
import PendingButton from "@/components/rails/PendingButton";
import { deleteTripAction, takeDownTripAction, type RailsActionState } from "@/app/operator/rails-actions";

const IDLE: RailsActionState = { status: "idle" };

/**
 * How an operator stops selling a trip, or gets rid of one. Taking it down keeps every booking
 * as it is; deleting is only for a trip nobody has ever booked.
 */
export default function ManageTrip({ listingId, live, bookings }: { listingId: string; live: boolean; bookings: number }) {
  const [downState, takeDown] = useActionState(takeDownTripAction.bind(null, listingId), IDLE);
  const [deleteState, remove] = useActionState(deleteTripAction.bind(null, listingId), IDLE);
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="adm-card rl-stack">
      {live ? (
        <form action={takeDown} className="rl-form">
          <p className="ds-body-sm">
            Stops new bookings. Everyone already booked keeps their booking, and you can publish the trip again whenever you like.
          </p>
          <ActionNotice state={downState} />
          <div className="rl-actions">
            <PendingButton variant="secondary" pending="Taking down…">Take this trip down</PendingButton>
          </div>
        </form>
      ) : null}

      {bookings > 0 ? (
        <p className="ds-caption">
          This trip has {bookings} booking{bookings === 1 ? "" : "s"} on record, so it cannot be deleted.
          {live ? "" : " Its bookings stay as they are."}
        </p>
      ) : live ? (
        <p className="ds-caption">To delete this trip, take it down first.</p>
      ) : confirming ? (
        <form action={remove} className="rl-danger rl-form">
          <p className="ds-body-sm">The trip, its schedule and its prices are removed for good. This cannot be undone.</p>
          <label className="rl-switch">
            <input type="checkbox" name="confirm" />
            <span className="ds-body-sm">Yes, delete this trip</span>
          </label>
          <ActionNotice state={deleteState} />
          <div className="rl-actions">
            <PendingButton danger pending="Deleting…">Delete trip</PendingButton>
            <button type="button" className="rl-btn rl-btn--quiet" onClick={() => setConfirming(false)}>Keep it</button>
          </div>
        </form>
      ) : (
        <button type="button" className="rl-btn rl-btn--quiet rl-self-start" onClick={() => setConfirming(true)}>Delete this trip…</button>
      )}
    </div>
  );
}
