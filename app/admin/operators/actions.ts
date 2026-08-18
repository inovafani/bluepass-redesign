"use server";

import { requireCurrentAdmin } from "@/lib/services/auth/admin";
import { sendOperatorLoginInvite } from "@/lib/services/admin/operator-login-invite";

export type OperatorLoginInviteState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | {
      status: "sent";
      email: string;
      /** Present only outside production — lets the invite be followed without a mailbox. */
      developmentResetUrl?: string;
    };

/**
 * Mails an operator the link that sets their first password.
 *
 * Re-derives the admin itself rather than trusting the page-load gate, like every other write in
 * this console. That matters more here than it looks: this action sends a working
 * account-takeover link to an address, so a tab left open after the account was demoted must not
 * still be able to fire it.
 *
 * Only the profile id crosses the wire. The address is read off the profile inside
 * `sendOperatorLoginInvite` — accepting an email from the form would let anyone holding a stale
 * admin page redirect an operator's login link to an inbox of their choosing.
 */
export async function sendOperatorLoginInviteAction(
  _previous: OperatorLoginInviteState,
  formData: FormData,
): Promise<OperatorLoginInviteState> {
  const admin = await requireCurrentAdmin();

  if (!admin) {
    return {
      status: "error",
      message: "Your admin session is no longer valid. Sign in again before sending an invite.",
    };
  }

  const operatorProfileId = formData.get("operatorProfileId");

  if (typeof operatorProfileId !== "string" || !operatorProfileId.trim()) {
    return { status: "error", message: "That request was malformed. Reload the page and try again." };
  }

  let result;

  try {
    result = await sendOperatorLoginInvite({ operatorProfileId: operatorProfileId.trim() });
  } catch (error) {
    /* A mail-provider failure in production throws out of `sendAuthEmail`. The token row has
       already been written by then, so the honest report is "we could not send it", not "sent". */
    return {
      status: "error",
      message: error instanceof Error ? error.message : "That invite could not be sent.",
    };
  }

  if (!result.ok) {
    return { status: "error", message: result.message };
  }

  return {
    status: "sent",
    email: result.email,
    ...(result.developmentResetUrl ? { developmentResetUrl: result.developmentResetUrl } : {}),
  };
}
