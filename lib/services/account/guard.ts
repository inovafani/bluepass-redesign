import { redirect } from "next/navigation";
import { getCurrentTraveller, type CurrentTraveller } from "@/lib/services/auth/session";

/**
 * The gate on the traveller's own area.
 *
 * Deliberately weaker than `requireOperatorOrRedirect`, and the difference is worth stating.
 * `/operator` has to answer "*which* operator is this?", so it resolves a profile row and refuses
 * without one. `/account` asks nothing of the sort: the only thing it shows is what belongs to the
 * signed-in account, resolved from the session cookie and never from a URL or a form. There is no
 * neighbouring traveller's data an authorised session could be pointed at, so being signed in is
 * the whole requirement.
 *
 * The `TRAVELLER` role specifically is *not* required. Every self-registered account has it, but
 * accounts minted by `createManualOperator` and the Rezdy sync carry `["OPERATOR"]` alone — and
 * some of those people have talked to Kai and have genuine booking history under the same account
 * id. Gating on the role would hide a traveller's real bookings from them to enforce a
 * classification that protects nothing.
 */
export async function requireSignedInOrRedirect(next: string): Promise<CurrentTraveller> {
  const traveller = await getCurrentTraveller();

  if (!traveller) {
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  return traveller;
}
