import { cookies } from "next/headers";
import type { ReferralPartnerRole } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export const REFERRAL_ATTRIBUTION_COOKIE = "bluepass_ref";

export type ReferralAttribution = {
  code: string;
  referralLinkId?: string;
  referralPartnerId?: string;
  role?: ReferralPartnerRole;
  label?: string;
};

export function normalizeReferralCode(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 64);
}

function isApprovedStatus(status?: string) {
  return status === "APPROVED" || status === "LIVE";
}

/**
 * Resolves a `?ref=` code against a real `ReferralLink`, gated on the partner/operator behind it
 * actually being approved - not just on `ReferralLink.active` (which nothing in this codebase ever
 * sets to false, and existed before this approval check as the only gate). Without this, a link
 * created for a still-PENDING_REVIEW application (or one for a partner later DECLINED) would go on
 * earning commission indefinitely just because the row exists.
 *
 * Returns the unresolved `{ code }` shape - the same shape an unknown code gets - for any code that
 * doesn't resolve to an approved partner, so callers don't need a separate "not approved yet" case:
 * downstream (Conversation attribution, the commission split), an unresolved attribution is already
 * defined to mean "no credit, no commission."
 */
export async function resolveReferralAttribution(rawCode: string): Promise<{
  attribution: ReferralAttribution;
  resolvedLinkId: string | undefined;
}> {
  const code = normalizeReferralCode(rawCode);

  if (!code) {
    return { attribution: { code: rawCode }, resolvedLinkId: undefined };
  }

  const referralLink = await prisma.referralLink.findUnique({
    where: { code },
    select: {
      id: true,
      code: true,
      label: true,
      active: true,
      partner: {
        select: {
          id: true,
          role: true,
          name: true,
          handle: true,
          // `take: 1` because both relations are effectively 1:1 in practice
          // (PartnerProfile/OperatorProfile.referralPartnerId is @unique) even though the schema
          // models them as lists on ReferralPartner's side.
          partnerProfiles: { select: { status: true }, take: 1 },
          operatorProfiles: { select: { status: true }, take: 1 },
        },
      },
    },
  });

  const partnerIsApproved = Boolean(
    referralLink &&
      (isApprovedStatus(referralLink.partner.partnerProfiles[0]?.status) ||
        isApprovedStatus(referralLink.partner.operatorProfiles[0]?.status)),
  );

  if (!referralLink || !referralLink.active || !partnerIsApproved) {
    return { attribution: { code }, resolvedLinkId: undefined };
  }

  return {
    attribution: {
      code: referralLink.code,
      referralLinkId: referralLink.id,
      referralPartnerId: referralLink.partner.id,
      role: referralLink.partner.role,
      label: referralLink.label ?? referralLink.partner.handle ?? referralLink.partner.name,
    },
    resolvedLinkId: referralLink.id,
  };
}

/**
 * The cookie holds nothing but the raw `?ref=` code - never a partner/link id, and never anything
 * else derived from it. Those used to be baked in at track-time via a base64 JSON blob with no
 * signature, which meant anyone could edit their own `bluepass_ref` cookie in devtools and set
 * `referralPartnerId` to any approved partner's id directly, skipping `resolveReferralAttribution`'s
 * approval check entirely - Kai's ledger trusted that id as-is (`Boolean(input.referralPartnerId)`
 * was its only check) and paid real, withdrawable commission on it. Re-resolving the code against
 * the database on every read closes that hole and a staleness one at the same time: a partner
 * declined *after* the cookie was set now stops earning credit on the very next message instead of
 * however long the 90-day cookie has left.
 */
export async function getReferralAttributionFromCookies() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(REFERRAL_ATTRIBUTION_COOKIE)?.value;

  if (!raw) {
    return undefined;
  }

  const code = normalizeReferralCode(raw);

  if (!code) {
    return undefined;
  }

  const { attribution } = await resolveReferralAttribution(code);
  return attribution;
}
