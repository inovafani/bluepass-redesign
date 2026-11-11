"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { disputeState } from "@/lib/services/admin/bookings";
import { requireCurrentAdmin } from "@/lib/services/auth/admin";
import { syncCalendarSoon } from "@/lib/services/rails/background";
import { cancelBooking } from "@/lib/services/rails/bookings";
import { railsPayments } from "@/lib/services/rails/payments";
import type { RailsActionState } from "@/app/operator/rails-actions";

/**
 * Cancels a website booking on an operator's behalf and refunds the guest in full, through the same
 * `cancelBooking` the operator uses, so the database and Stripe cannot disagree about what happened
 * (a refund made by hand in the Stripe dashboard would leave the booking CONFIRMED and PAID, and the
 * settlement run would then try to pay the operator for money that is gone).
 *
 * Refused, with the reason, where doing it here would be wrong:
 *  - already paid out to the operator: the transfer has to be reversed in Stripe first;
 *  - a dispute is open or lost: refunding as well would hand the guest the money twice.
 */
export async function adminCancelBookingAction(bookingId: string, _prev: RailsActionState, form: FormData): Promise<RailsActionState> {
  const admin = await requireCurrentAdmin();
  if (!admin) return { status: "error", message: "Your admin session is no longer valid. Sign in again." };
  if (form.get("confirm") !== "on") return { status: "error", message: "Tick the box to confirm the cancellation." };

  const booking = await prisma.listingBooking.findUnique({
    where: { id: bookingId },
    select: { operatorProfileId: true, settledAt: true, events: { select: { type: true } } },
  });
  if (!booking) return { status: "error", message: "That booking no longer exists." };
  if (booking.settledAt) {
    return { status: "error", message: "The operator has already been paid for this booking. Reverse the transfer in Stripe first, then cancel it." };
  }
  const dispute = disputeState(booking.events.map((e) => e.type));
  if (dispute === "open" || dispute === "lost") {
    return { status: "error", message: "This booking has a dispute. Refunding as well would pay the guest twice; answer the dispute in Stripe instead." };
  }

  const reason = String(form.get("reason") ?? "").trim().slice(0, 300) || "Cancelled by Bluepass";
  const result = await cancelBooking(
    { bookingId, operatorProfileId: booking.operatorProfileId, actor: `admin:${admin.email}`, reason },
    railsPayments(),
  );
  if (!result.ok) return { status: "error", message: result.reason };

  revalidatePath("/admin/bookings");
  syncCalendarSoon(booking.operatorProfileId);
  return {
    status: "done",
    message: result.refundedCents > 0 ? "Cancelled and refunded in full. The guest and the operator have been emailed." : "Cancelled. The seats are back on sale.",
  };
}
