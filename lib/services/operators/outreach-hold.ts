import { prisma } from "@/lib/db/prisma";

/**
 * Every operator email that enters the system starts held: the outreach gate refuses anyone on the
 * suppression list, so a held address is never cold-emailed, whatever OUTREACH_ENABLED says.
 * Tony's side (2026-11-11): restrictive default only; a hold is removed solely on his explicit
 * per-operator send approval, and approving the page is not that approval.
 *
 * `update: {}` keeps a real reason (unsubscribed, bounced) if the address was already suppressed.
 * Returns the query unawaited so a caller can put it inside a `prisma.$transaction([...])`.
 *
 * shortcut: keyed on the address, so an edit made straight in the database (not through the importers
 * or the in-person confirmation) is not held; move to a lead-level flag if that ever matters.
 */
export const HOLD_REASON =
  "HOLD: no outreach permission (Tony's side, 2026-11-11). Delete only on explicit per-operator send approval; page approval alone is not permission.";

export function outreachHoldQuery(email: string, source: string) {
  const address = email.trim().toLowerCase();
  return prisma.outreachSuppression.upsert({
    where: { email: address },
    create: { email: address, reason: HOLD_REASON, source },
    update: {},
  });
}

/** The same hold for an address that may be missing: nothing to hold when there is no email. */
export async function holdOutreach(email: string | null | undefined, source: string) {
  if (email?.trim()) await outreachHoldQuery(email, source);
}
