import type { PartnerCategory } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

/**
 * Viewing and lightly editing a partner profile that already exists — the counterpart to
 * `operator-edit.ts` for partners. Closes the same gap Operators already had solved: before this,
 * an approved/declined partner fell out of `/admin/approvals` (which only ever shows PENDING_REVIEW
 * rows) with nowhere left to browse them.
 *
 * Deliberately does NOT carry a payout-method-style edit form the way `operator-edit.ts` does — a
 * partner's own bank details are self-managed on `/partner-portal` (see
 * `lib/services/partner/payout-settings.ts`), and the payout *request* queue already has its own
 * admin surface (`partner-payouts.ts`, `/admin/payouts`). What's editable here is the same shape of
 * "business info" Operators exposes: category and an admin-only notes field.
 */

export type PartnerListRow = {
  id: string;
  handle: string | null;
  accountEmail: string;
  status: string;
  partnerCategory: PartnerCategory | null;
  referralPartnerName: string | null;
  hasPayoutDetails: boolean;
  createdAt: Date;
};

export async function listPartnerProfiles(): Promise<PartnerListRow[]> {
  const rows = await prisma.partnerProfile.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      handle: true,
      status: true,
      partnerCategory: true,
      encryptedPayoutDetails: true,
      createdAt: true,
      account: { select: { email: true } },
      referralPartner: { select: { name: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    handle: row.handle,
    accountEmail: row.account.email,
    status: row.status,
    partnerCategory: row.partnerCategory,
    referralPartnerName: row.referralPartner?.name ?? null,
    hasPayoutDetails: row.encryptedPayoutDetails != null,
    createdAt: row.createdAt,
  }));
}

export type PartnerEditView = {
  id: string;
  accountEmail: string;
  status: string;
  handle: string | null;
  audienceUrl: string | null;
  instagramUrl: string | null;
  youtubeUrl: string | null;
  tiktokUrl: string | null;
  partnerCategory: PartnerCategory | null;
  notes: string | null;
  hasPayoutDetails: boolean;
  referralPartnerName: string | null;
  createdAt: Date;
};

export async function getPartnerForEdit(id: string): Promise<PartnerEditView | null> {
  const row = await prisma.partnerProfile.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      handle: true,
      audienceUrl: true,
      instagramUrl: true,
      youtubeUrl: true,
      tiktokUrl: true,
      partnerCategory: true,
      notes: true,
      encryptedPayoutDetails: true,
      createdAt: true,
      account: { select: { email: true } },
      referralPartner: { select: { name: true } },
    },
  });

  if (!row) return null;

  return {
    id: row.id,
    accountEmail: row.account.email,
    status: row.status,
    handle: row.handle,
    audienceUrl: row.audienceUrl,
    instagramUrl: row.instagramUrl,
    youtubeUrl: row.youtubeUrl,
    tiktokUrl: row.tiktokUrl,
    partnerCategory: row.partnerCategory,
    notes: row.notes,
    hasPayoutDetails: row.encryptedPayoutDetails != null,
    referralPartnerName: row.referralPartner?.name ?? null,
    createdAt: row.createdAt,
  };
}

const PARTNER_CATEGORY_VALUES = [
  "CREATOR",
  "DIVE_SHOP",
  "TRAVEL_AGENCY",
  "TRIP_LEADER",
  "DIVE_INSTRUCTOR",
  "ADVISOR",
  "OCEAN_PARTNER",
] as const satisfies readonly PartnerCategory[];

export function isPartnerCategory(value: string): value is PartnerCategory {
  return (PARTNER_CATEGORY_VALUES as readonly string[]).includes(value);
}

export async function updatePartnerAdminInfo(
  id: string,
  data: { partnerCategory: PartnerCategory | null; notes: string },
) {
  await prisma.partnerProfile.update({
    where: { id },
    data: { partnerCategory: data.partnerCategory, notes: data.notes || null },
  });
}
