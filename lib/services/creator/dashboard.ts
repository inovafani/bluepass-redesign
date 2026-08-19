import { prisma } from "@/lib/db/prisma";
import { buildReferralShareUrl } from "@/lib/services/referrals/application-approval";
import {
  listCommissionLedgerEntries,
  type CommissionLedgerEntryRow,
} from "@/lib/services/referrals/commission-ledger";

export type CreatorReferralLink = {
  id: string;
  code: string;
  label: string | null;
  active: boolean;
  shareUrl: string;
  clickCount: number;
};

/**
 * What this creator can refer with today, plus how many taps each link has had.
 *
 * Returns an empty array (not an error) when `referralPartnerId` is null — that is the ordinary
 * shape of an application still pending review or declined: `approveReferralApplication` is what
 * actually creates the `ReferralPartner` + first `ReferralLink`, and only runs on approval.
 */
export async function loadCreatorReferralLinks(referralPartnerId: string | null): Promise<CreatorReferralLink[]> {
  if (!referralPartnerId) return [];

  const links = await prisma.referralLink.findMany({
    where: { partnerId: referralPartnerId },
    orderBy: { createdAt: "asc" },
  });

  return Promise.all(
    links.map(async (link) => ({
      id: link.id,
      code: link.code,
      label: link.label,
      active: link.active,
      shareUrl: buildReferralShareUrl(link.code, link.targetPath) ?? "",
      clickCount: await prisma.referralClick.count({ where: { referralLinkId: link.id } }),
    })),
  );
}

export type CreatorCommissionSummary = {
  entries: CommissionLedgerEntryRow[];
  totalCentsByCurrency: Record<string, number>;
};

/**
 * This creator's own commission lines, newest first — the Indonesia marketplace side of it.
 *
 * The AU/Boattime side (`PmsBookingLedgerEntry`'s `CREATOR_COMMISSION_ESTIMATE`, in Kai) carries the
 * same `referralPartnerId` as of 2026-08-19 but isn't queried here yet: Kai's ledger endpoints are
 * tenant-scoped, not referral-partner-scoped, so pulling a creator's AU earnings needs a new lookup
 * on that side first rather than a filter added to an existing call. Flagged, not silently omitted.
 */
export async function loadCreatorCommissionSummary(
  referralPartnerId: string | null,
): Promise<CreatorCommissionSummary> {
  if (!referralPartnerId) {
    return { entries: [], totalCentsByCurrency: {} };
  }

  const entries = await listCommissionLedgerEntries({ referralPartnerId, take: 100 });

  const totalCentsByCurrency: Record<string, number> = {};
  for (const entry of entries) {
    totalCentsByCurrency[entry.currency] = (totalCentsByCurrency[entry.currency] ?? 0) + entry.amountCents;
  }

  return { entries, totalCentsByCurrency };
}
