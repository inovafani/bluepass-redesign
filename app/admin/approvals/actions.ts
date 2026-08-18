"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentAdmin } from "@/lib/services/auth/admin";
import {
  isApprovalKind,
  resolveApproval,
  type ApprovalDecision,
} from "@/lib/services/admin/review-queue";

export type ReviewActionState =
  | { status: "idle" }
  | { status: "done"; message: string }
  | { status: "error"; message: string };

/**
 * Approve and decline are two separate actions rather than one action reading a
 * `decision` field off the submit button.
 *
 * React's `useActionState` dispatch builds the FormData without the submitter,
 * so a `<button name="decision" value="approve">` inside the form arrives
 * server-side as nothing at all — verified in the browser, where every decision
 * came back "malformed" while the row sat there still pending. Binding the
 * decision to the action instead of shipping it through the form removes the
 * dependency entirely, and with it any way for a client to post a decision the
 * button it pressed did not mean.
 */
export async function approveReviewAction(
  previous: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  return review(previous, formData, "approve");
}

export async function declineReviewAction(
  previous: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  return review(previous, formData, "decline");
}

/**
 * The admin check is repeated here rather than inherited from the layout. The
 * page was rendered at some earlier moment; between then and this POST the
 * account may have lost `ADMIN` or dropped out of `BLUEPASS_ADMIN_EMAILS`, and
 * the stale tab in front of them still has working buttons. Approving an
 * operator claim hands a business the ability to be paid — it is not a decision
 * that may rest on a check that has already gone out of date.
 */
async function review(
  _previous: ReviewActionState,
  formData: FormData,
  decision: ApprovalDecision,
): Promise<ReviewActionState> {
  const admin = await requireCurrentAdmin();

  if (!admin) {
    return {
      status: "error",
      message: "Your admin session is no longer valid. Sign in again before reviewing this.",
    };
  }

  const kind = formData.get("kind");
  const id = formData.get("id");

  /* The form is the only caller today, but it is still a public POST endpoint —
     validate against the known set rather than passing strings through. */
  if (!isApprovalKind(kind) || typeof id !== "string" || !id) {
    return { status: "error", message: "That request was malformed. Reload the page and try again." };
  }

  try {
    await resolveApproval({ kind, id, decision, reviewerEmail: admin.email });
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "That decision could not be recorded.",
    };
  }

  /* Both the queue and the rail's counter are now stale. */
  revalidatePath("/admin/approvals");
  revalidatePath("/admin");

  return { status: "done", message: decision === "approve" ? "Approved." : "Declined." };
}
