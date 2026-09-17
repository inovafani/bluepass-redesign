import { prisma } from "@/lib/db/prisma";
import {
  listKaiCorePmsBookingLedgerForReferralPartner,
  type KaiCorePmsBookingLedgerEntry,
} from "@/lib/services/kai-core/client";
import {
  buildReferralShareUrl,
  buildUniqueReferralCode,
} from "@/lib/services/referrals/application-approval";
import { partnerCommissionLedgerKind, listCommissionLedgerEntries } from "@/lib/services/referrals/commission-ledger";

/** A partner minting their own links has no natural ceiling otherwise - one per real campaign is
 * the expected use, so this is generous headroom against abuse, not a real product constraint. */
const MAX_SELF_SERVE_LINKS = 10;

export type AuLedgerLoader = (input: {
  referralPartnerId: string;
  take?: number;
}) => Promise<KaiCorePmsBookingLedgerEntry[]>;

export type PartnerReferralLink = {
  id: string;
  code: string;
  label: string | null;
  active: boolean;
  shareUrl: string;
  clickCount: number;
};

/**
 * What this partner can refer with today, plus how many taps each link has had.
 *
 * Returns an empty array (not an error) when `referralPartnerId` is null — that is the ordinary
 * shape of an application still pending review or declined: `approveReferralApplication` is what
 * actually creates the `ReferralPartner` + first `ReferralLink`, and only runs on approval.
 */
export async function loadPartnerReferralLinks(referralPartnerId: string | null): Promise<PartnerReferralLink[]> {
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

export type CreatePartnerReferralLinkResult =
  | { ok: true; link: PartnerReferralLink }
  | { ok: false; error: string };

/**
 * Mints an extra link under a partner who is already approved (and so already has one from
 * `createPartnerWithLink` in application-approval.ts) - for a second channel/campaign, since one
 * auto-created link per partner was all that flow ever provisioned. Reuses the same code-building
 * helper as that original provisioning step rather than a second implementation of it.
 */
export async function createPartnerReferralLink(
  referralPartnerId: string,
  input: { label?: string | null },
): Promise<CreatePartnerReferralLinkResult> {
  const existingCount = await prisma.referralLink.count({ where: { partnerId: referralPartnerId } });

  if (existingCount >= MAX_SELF_SERVE_LINKS) {
    return { ok: false, error: `You can have at most ${MAX_SELF_SERVE_LINKS} links. Reach out to reuse one.` };
  }

  const partner = await prisma.referralPartner.findUnique({
    where: { id: referralPartnerId },
    select: { name: true },
  });

  if (!partner) {
    return { ok: false, error: "Your partner record could not be found." };
  }

  const label = input.label?.trim() || null;
  const code = await buildUniqueReferralCode(label || partner.name);
  const link = await prisma.referralLink.create({
    data: { partnerId: referralPartnerId, code, label, targetPath: "/" },
  });

  return {
    ok: true,
    link: {
      id: link.id,
      code: link.code,
      label: link.label,
      active: link.active,
      shareUrl: buildReferralShareUrl(link.code, link.targetPath) ?? "",
      clickCount: 0,
    },
  };
}

/**
 * One commission line, whichever region it came from. Indonesia's `CommissionLedgerEntry` and AU's
 * `PmsBookingLedgerEntry` are two different tables with two different extra fields (account vs.
 * attempt/booking), but the dashboard only ever displays the five fields both already share — so
 * this is what both get normalised down to, rather than forcing one shape to pretend it's the other.
 */
export type PartnerCommissionEntryRow = {
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

export type PartnerCommissionSummary = {
  entries: PartnerCommissionEntryRow[];
  totalCentsByCurrency: Record<string, number>;
};

/**
 * This partner's own commission lines, newest first, across both regions.
 *
 * The two sources are genuinely different systems (Indonesia's own Prisma table here vs. a network
 * call to Kai for AU), so they're fetched independently and merged after - one being slow or down
 * shouldn't blank out the other's real numbers. AU wiring landed 2026-08-19 (see
 * listPmsBookingLedgerEntriesForReferralPartner in Kai and the dashboard note that used to live here
 * flagging this gap).
 */
export async function loadPartnerCommissionSummary(
  referralPartnerId: string | null,
  listAuLedger: AuLedgerLoader = listKaiCorePmsBookingLedgerForReferralPartner,
): Promise<PartnerCommissionSummary> {
  if (!referralPartnerId) {
    return { entries: [], totalCentsByCurrency: {} };
  }

  const [indonesiaEntries, auEntries] = await Promise.all([
    // kind filter matters: buildLedgerEntry in commission-ledger.ts stamps referralPartnerId onto
    // every line for a booking this partner referred (conservation, platform commission, payment
    // processing, operator payout), not just the partner's own share - without this filter, "what
    // you've earned" would include money that was never the partner's.
    listCommissionLedgerEntries({ referralPartnerId, kind: partnerCommissionLedgerKind(), take: 100 }),
    listAuLedger({ referralPartnerId, take: 100 }).catch(() => []),
  ]);

  const entries: PartnerCommissionEntryRow[] = [
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
