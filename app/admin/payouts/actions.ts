"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentAdmin } from "@/lib/services/auth/admin";
import {
  releaseKaiCoreBluePassLedgerEntryPayoutViaStripe,
  settleKaiCorePmsBooking,
} from "@/lib/services/kai-core/client";

export type PayoutActionState =
  | { status: "idle" }
  | { status: "done"; message: string }
  | { status: "error"; message: string };

/**
 * Releases one Australia/Rezdy booking's operator payout.
 *
 * Kai resolves the operator's Stripe Connect account itself (resolveOperatorPayoutAccount), so no
 * account id is sent from here — this repo's copy could be stale, and guessing wrong on a payout
 * means real money reaching the wrong business. Addressed by attempt id because the AU side settles
 * a whole booking, not a single ledger line.
 */
export async function settleAustraliaBookingAction(
  _previous: PayoutActionState,
  formData: FormData,
): Promise<PayoutActionState> {
  const admin = await requireCurrentAdmin();

  if (!admin) {
    return { status: "error", message: "Your admin session is no longer valid. Sign in again." };
  }

  const tenantSlug = formData.get("tenantSlug");
  const attemptId = formData.get("attemptId");

  if (typeof tenantSlug !== "string" || !tenantSlug || typeof attemptId !== "string" || !attemptId) {
    return { status: "error", message: "That request was malformed. Reload the page and try again." };
  }

  try {
    await settleKaiCorePmsBooking({ tenantSlug, attemptId, reviewerEmail: admin.email });
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "That payout could not be released.",
    };
  }

  revalidatePath("/admin/payouts");
  return { status: "done", message: "Payout released." };
}

/**
 * Releases one Indonesia/marketplace ledger line via Stripe Connect.
 *
 * Unlike the AU path this one does need an explicit `stripeConnectAccountId` — Kai's mark-paid route
 * branches on which field it is given, and the Stripe branch is the one that moves money rather than
 * just recording an attestation.
 */
export async function releaseIndonesiaPayoutAction(
  _previous: PayoutActionState,
  formData: FormData,
): Promise<PayoutActionState> {
  const admin = await requireCurrentAdmin();

  if (!admin) {
    return { status: "error", message: "Your admin session is no longer valid. Sign in again." };
  }

  const tenantSlug = formData.get("tenantSlug");
  const entryId = formData.get("entryId");
  const stripeConnectAccountId = formData.get("stripeConnectAccountId");

  if (typeof tenantSlug !== "string" || !tenantSlug || typeof entryId !== "string" || !entryId) {
    return { status: "error", message: "That request was malformed. Reload the page and try again." };
  }

  if (typeof stripeConnectAccountId !== "string" || !stripeConnectAccountId.trim()) {
    return {
      status: "error",
      message: "A Stripe Connect account id is required to release this payout.",
    };
  }

  try {
    await releaseKaiCoreBluePassLedgerEntryPayoutViaStripe({
      tenantSlug,
      entryId,
      stripeConnectAccountId: stripeConnectAccountId.trim(),
      reviewerEmail: admin.email,
    });
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "That payout could not be released.",
    };
  }

  revalidatePath("/admin/payouts");
  return { status: "done", message: "Payout released." };
}
