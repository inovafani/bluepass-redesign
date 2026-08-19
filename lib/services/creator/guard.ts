import type { Prisma } from "@prisma/client";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getCurrentTraveller } from "@/lib/services/auth/session";
import { CONSOLE_PATHNAME_HEADER } from "@/lib/services/pathname";

const creatorProfileSelect = {
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

export type CreatorProfileView = Prisma.CreatorProfileGetPayload<{
  select: typeof creatorProfileSelect;
}>;

export type CreatorAccountView = { id: string; email: string; displayName: string | null };

export type CreatorAccess =
  | { ok: true; account: CreatorAccountView; profile: CreatorProfileView }
  /**
   * Mirrors OperatorAccess's three-way split (see operator/guard.ts) for the same reason: SIGNED_OUT
   * is ordinary, NOT_CREATOR and NO_PROFILE both mean "you should not be here" and are not loading
   * states.
   */
  | { ok: false; reason: "SIGNED_OUT" | "NOT_CREATOR" | "NO_PROFILE" };

/** The pathname of the creator page currently rendering, per `middleware.ts`. */
export async function currentCreatorPathname(fallback = "/creator") {
  const requestHeaders = await headers();
  const pathname = requestHeaders.get(CONSOLE_PATHNAME_HEADER);

  return pathname && pathname.startsWith("/creator") ? pathname : fallback;
}

/**
 * Resolves one account against the creator area's two requirements: the role, and a profile of
 * their own. Split out from the redirecting wrapper below so the decision can be tested against
 * real rows without a request context, same as `resolveOperatorAccess`.
 */
export async function resolveCreatorAccess(accountId: string): Promise<CreatorAccess> {
  const account = await prisma.bluePassAccount.findUnique({
    where: { id: accountId },
    select: {
      id: true,
      email: true,
      displayName: true,
      roles: true,
      creatorProfile: { select: creatorProfileSelect },
    },
  });

  if (!account) {
    return { ok: false, reason: "SIGNED_OUT" };
  }

  if (!account.roles.includes("CREATOR")) {
    return { ok: false, reason: "NOT_CREATOR" };
  }

  if (!account.creatorProfile) {
    return { ok: false, reason: "NO_PROFILE" };
  }

  return {
    ok: true,
    account: { id: account.id, email: account.email, displayName: account.displayName },
    profile: account.creatorProfile,
  };
}

/** The signed-in visitor's creator access, or why they have none. */
export async function currentCreatorAccess(): Promise<CreatorAccess> {
  const traveller = await getCurrentTraveller();

  if (!traveller) {
    return { ok: false, reason: "SIGNED_OUT" };
  }

  return resolveCreatorAccess(traveller.accountId);
}

/**
 * The gate every creator surface sits behind — the mirror of `requireOperatorOrRedirect`. Call it
 * from the layout *and* from any server action, for the same reason: the layout's check only proves
 * the account was a creator when the page loaded.
 */
export async function requireCreatorOrRedirect(next: string) {
  const access = await currentCreatorAccess();

  if (!access.ok) {
    const params = new URLSearchParams({ creator: access.reason.toLowerCase().replace(/_/g, "-") });

    if (access.reason !== "NO_PROFILE") {
      params.set("next", next);
    }

    redirect(`/login?${params.toString()}`);
  }

  return access;
}
