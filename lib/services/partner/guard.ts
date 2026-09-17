import type { Prisma } from "@prisma/client";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getCurrentTraveller } from "@/lib/services/auth/session";
import { CONSOLE_PATHNAME_HEADER } from "@/lib/services/pathname";

const partnerProfileSelect = {
  id: true,
  status: true,
  handle: true,
  audienceUrl: true,
  instagramUrl: true,
  youtubeUrl: true,
  tiktokUrl: true,
  notes: true,
  referralPartnerId: true,
} as const;

export type PartnerProfileView = Prisma.PartnerProfileGetPayload<{
  select: typeof partnerProfileSelect;
}>;

export type PartnerAccountView = { id: string; email: string; displayName: string | null };

export type PartnerAccess =
  | { ok: true; account: PartnerAccountView; profile: PartnerProfileView }
  /**
   * Mirrors OperatorAccess's three-way split (see operator/guard.ts) for the same reason: SIGNED_OUT
   * is ordinary, NOT_PARTNER and NO_PROFILE both mean "you should not be here" and are not loading
   * states.
   */
  | { ok: false; reason: "SIGNED_OUT" | "NOT_PARTNER" | "NO_PROFILE" };

/** The pathname of the partner page currently rendering, per `middleware.ts`. */
export async function currentPartnerPathname(fallback = "/partner-portal") {
  const requestHeaders = await headers();
  const pathname = requestHeaders.get(CONSOLE_PATHNAME_HEADER);

  // Exact-prefix match only - a plain `startsWith("/partner-portal")` would still be fine here,
  // but this guards against the same one-letter mixup the route rename itself was trying to avoid
  // (a naive `startsWith("/partner")` would also match the public `/partners` and `/partners/apply`).
  return pathname && (pathname === "/partner-portal" || pathname.startsWith("/partner-portal/"))
    ? pathname
    : fallback;
}

/**
 * Resolves one account against the partner area's two requirements: the role, and a profile of
 * their own. Split out from the redirecting wrapper below so the decision can be tested against
 * real rows without a request context, same as `resolveOperatorAccess`.
 */
export async function resolvePartnerAccess(accountId: string): Promise<PartnerAccess> {
  const account = await prisma.bluePassAccount.findUnique({
    where: { id: accountId },
    select: {
      id: true,
      email: true,
      displayName: true,
      roles: true,
      partnerProfile: { select: partnerProfileSelect },
    },
  });

  if (!account) {
    return { ok: false, reason: "SIGNED_OUT" };
  }

  if (!account.roles.includes("PARTNER")) {
    return { ok: false, reason: "NOT_PARTNER" };
  }

  if (!account.partnerProfile) {
    return { ok: false, reason: "NO_PROFILE" };
  }

  return {
    ok: true,
    account: { id: account.id, email: account.email, displayName: account.displayName },
    profile: account.partnerProfile,
  };
}

/** The signed-in visitor's partner access, or why they have none. */
export async function currentPartnerAccess(): Promise<PartnerAccess> {
  const traveller = await getCurrentTraveller();

  if (!traveller) {
    return { ok: false, reason: "SIGNED_OUT" };
  }

  return resolvePartnerAccess(traveller.accountId);
}

/**
 * The gate every partner surface sits behind — the mirror of `requireOperatorOrRedirect`. Call it
 * from the layout *and* from any server action, for the same reason: the layout's check only proves
 * the account was a partner when the page loaded.
 */
export async function requirePartnerOrRedirect(next: string) {
  const access = await currentPartnerAccess();

  if (!access.ok) {
    const params = new URLSearchParams({ partner: access.reason.toLowerCase().replace(/_/g, "-") });

    if (access.reason !== "NO_PROFILE") {
      params.set("next", next);
    }

    redirect(`/login?${params.toString()}`);
  }

  return access;
}
