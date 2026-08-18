import { prisma } from "@/lib/db/prisma";
import { createAndSendPasswordReset } from "@/lib/services/auth/password-reset";

export type OperatorLoginInviteResult =
  | { ok: true; email: string; companyName: string | null; developmentResetUrl?: string }
  | { ok: false; code: "PROFILE_NOT_FOUND" | "NO_EMAIL"; message: string };

/**
 * Sends an operator the link that lets them sign in for the first time.
 *
 * There is no separate invite mechanism, and there should not be one. The accounts
 * `createManualOperator` and the Rezdy sync create carry a random, unusable `passwordHash`, and
 * `createAndSendPasswordReset` works on any account regardless of whether the current password is a
 * real one or that placeholder — so "set your first password" and "I forgot my password" are the
 * same operation against the same single-use token table. A second token model next to it would be
 * another way to take over an account, with its own expiry and revocation bugs to find.
 *
 * The address is re-read from the profile rather than accepted from the caller: this mails out a
 * link that sets a password on a live account holding real payout details, so the destination must
 * come from the row itself and never from a form field.
 */
export async function sendOperatorLoginInvite(
  input: {
    operatorProfileId: string;
    baseUrl?: string;
  },
  /* Injectable for the same reason the Kai client takes a `fetchImpl`: the default really does put
     an email in someone's inbox, and a test that resolved the address correctly would otherwise
     prove it by mailing a live operator. */
  createReset: typeof createAndSendPasswordReset = createAndSendPasswordReset,
): Promise<OperatorLoginInviteResult> {
  const profile = await prisma.operatorProfile.findUnique({
    where: { id: input.operatorProfileId },
    select: {
      companyName: true,
      payoutContactEmail: true,
      account: { select: { email: true } },
    },
  });

  if (!profile) {
    return {
      ok: false,
      code: "PROFILE_NOT_FOUND",
      message: "That operator profile no longer exists. Reload the page and try again.",
    };
  }

  /* `payoutContactEmail` is the address the admin typed for this operator, but it is nullable on
     profiles the Rezdy sync created — the account's own email is the one the reset token would
     actually be checked against, so it is the fallback rather than a failure. */
  const email = profile.payoutContactEmail?.trim() || profile.account.email.trim();

  if (!email) {
    return {
      ok: false,
      code: "NO_EMAIL",
      message:
        "This operator has no contact email on file, so there is nowhere to send the invite. Add one to the profile first.",
    };
  }

  const result = await createReset({ email, baseUrl: input.baseUrl });

  return {
    ok: true,
    email,
    companyName: profile.companyName,
    /* Only ever set when no RESEND_API_KEY is configured — see `sendAuthEmail`. Surfacing it is what
       makes the flow completable on a laptop without a mailbox, the same way the register and
       forgot-password routes already do. */
    developmentResetUrl: result.developmentResetUrl,
  };
}
