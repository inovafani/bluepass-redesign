import { prisma } from "@/lib/db/prisma";
import {
  listKaiCorePmsBookingLedgerForReferralPartner,
  type KaiCorePmsBookingLedgerEntry,
} from "@/lib/services/kai-core/client";
import { buildReferralShareUrl } from "@/lib/services/referrals/application-approval";
import { listCommissionLedgerEntries } from "@/lib/services/referrals/commission-ledger";

type AuLedgerLoader = (input: {
  referralPartnerId: string;
  take?: number;
}) => Promise<KaiCorePmsBookingLedgerEntry[]>;

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

/**
 * One commission line, whichever region it came from. Indonesia's `CommissionLedgerEntry` and AU's
 * `PmsBookingLedgerEntry` are two different tables with two different extra fields (account vs.
 * attempt/booking), but the dashboard only ever displays the five fields both already share — so
 * this is what both get normalised down to, rather than forcing one shape to pretend it's the other.
 */
export type CreatorCommissionEntryRow = {
  id: string;
  region: "indonesia" | "au";
  kind: string;
  amountCents: number;
  currency: string;
  status: string;
  createdAt: Date;
  /** The booking this line came from, when the source has one to name (AU's `attempt.productTitle`). */
  label: string | null;
};

export type CreatorCommissionSummary = {
  entries: CreatorCommissionEntryRow[];
  totalCentsByCurrency: Record<string, number>;
};

/**
 * This creator's own commission lines, newest first, across both regions.
 *
 * The two sources are genuinely different systems (Indonesia's own Prisma table here vs. a network
 * call to Kai for AU), so they're fetched independently and merged after - one being slow or down
 * shouldn't blank out the other's real numbers. AU wiring landed 2026-08-19 (see
 * listPmsBookingLedgerEntriesForReferralPartner in Kai and the dashboard note that used to live here
 * flagging this gap).
 */
export async function loadCreatorCommissionSummary(
  referralPartnerId: string | null,
  listAuLedger: AuLedgerLoader = listKaiCorePmsBookingLedgerForReferralPartner,
): Promise<CreatorCommissionSummary> {
  if (!referralPartnerId) {
    return { entries: [], totalCentsByCurrency: {} };
  }

  const [indonesiaEntries, auEntries] = await Promise.all([
    listCommissionLedgerEntries({ referralPartnerId, take: 100 }),
    listAuLedger({ referralPartnerId, take: 100 }).catch(() => []),
  ]);

  const entries: CreatorCommissionEntryRow[] = [
    ...indonesiaEntries.map((entry) => ({
      id: entry.id,
      region: "indonesia" as const,
      kind: entry.kind,
      amountCents: entry.amountCents,
      currency: entry.currency,
      status: entry.status,
      createdAt: entry.createdAt,
      label: null,
    })),
    ...auEntries.map((entry) => ({
      id: entry.id,
      region: "au" as const,
      kind: entry.kind,
      amountCents: entry.amountCents,
      currency: entry.currency,
      status: entry.status,
      createdAt: new Date(entry.createdAt),
      label: entry.attempt?.productTitle ?? null,
    })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const totalCentsByCurrency: Record<string, number> = {};
  for (const entry of entries) {
    totalCentsByCurrency[entry.currency] = (totalCentsByCurrency[entry.currency] ?? 0) + entry.amountCents;
  }

  return { entries, totalCentsByCurrency };
}
