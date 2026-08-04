import type {
  BluePassAccountRole,
  Prisma,
  ReferralPartnerRole,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { splitBooking } from "@/lib/services/booking/unit-economics";

const REFERRAL_LEDGER_KINDS = [
  "CREATOR_COMMISSION_ESTIMATE",
  "BLUEPASS_PLATFORM_COMMISSION",
  "CONSERVATION_ALLOCATION",
  "PAYMENT_PROCESSING_ALLOCATION",
  "OPERATOR_PAYOUT_PLACEHOLDER",
] as const;

type ReferralLedgerKind = (typeof REFERRAL_LEDGER_KINDS)[number];

export type ReferralCommissionLedgerInput = {
  bookingInquiryId: string;
  referralPartnerId?: string | null;
  referralLinkId?: string | null;
  referralCode?: string | null;
  referralRole?: ReferralPartnerRole | null;
  budget?: string | null;
};

export async function syncReferralCommissionLedger(
  input: ReferralCommissionLedgerInput,
) {
  const budgetUsd = parseBudgetUsd(input.budget);
  const hasReferral = Boolean(input.referralPartnerId);
  const split = splitBooking(budgetUsd, input.referralRole === "CREATOR");
  const accountId = hasReferral
    ? await findReferralAccountId(input.referralPartnerId!, input.referralRole)
    : undefined;
  const metadata = {
    referralLinkId: input.referralLinkId,
    referralCode: input.referralCode,
    referralRole: input.referralRole,
    budget: input.budget,
    budgetUsd,
  } satisfies Prisma.InputJsonObject;

  await prisma.commissionLedgerEntry.deleteMany({
    where: {
      bookingInquiryId: input.bookingInquiryId,
      status: "PENDING",
      kind: { in: [...REFERRAL_LEDGER_KINDS] },
    },
  });

  const entries = [
    buildLedgerEntry(input, {
      kind: "CONSERVATION_ALLOCATION",
      amountCents: usdToCents(split.conservation),
      metadata,
    }),
    buildLedgerEntry(input, {
      kind: "PAYMENT_PROCESSING_ALLOCATION",
      amountCents: usdToCents(split.paymentProcessing),
      metadata,
    }),
    buildLedgerEntry(input, {
      kind: "BLUEPASS_PLATFORM_COMMISSION",
      amountCents: usdToCents(split.commission),
      role: "ADMIN",
      metadata,
    }),
    buildLedgerEntry(input, {
      kind: "OPERATOR_PAYOUT_PLACEHOLDER",
      amountCents: usdToCents(split.operatorNet),
      role: "OPERATOR",
      metadata,
    }),
  ];

  // Only the partner/creator line is conditional on a referral being attached - conservation,
  // payments, platform fee, and operator payout always post (see splitBooking).
  if (hasReferral) {
    entries.push(
      buildLedgerEntry(input, {
        kind: "CREATOR_COMMISSION_ESTIMATE",
        amountCents: usdToCents(split.creatorShare),
        accountId,
        role: input.referralRole === "CREATOR" ? "CREATOR" : undefined,
        metadata,
      }),
    );
  }

  await prisma.commissionLedgerEntry.createMany({ data: entries });
}

export function parseBudgetUsd(value?: string | null) {
  if (!value) {
    return 0;
  }

  const normalized = value.replace(/,/g, "").toLowerCase();
  const rangeMatch = normalized.match(
    /(?:\$|usd\s*)?\s*(\d{2,7})(?:\s*(?:-|to|–)\s*(?:\$|usd\s*)?(\d{2,7}))?/i,
  );

  if (!rangeMatch) {
    return 0;
  }

  const first = Number(rangeMatch[1]);
  const second = rangeMatch[2] ? Number(rangeMatch[2]) : undefined;

  if (!Number.isFinite(first)) {
    return 0;
  }

  if (second && Number.isFinite(second)) {
    return Math.round((first + second) / 2);
  }

  return first;
}

export function creatorCommissionLedgerKind() {
  return "CREATOR_COMMISSION_ESTIMATE" satisfies ReferralLedgerKind;
}

async function findReferralAccountId(
  referralPartnerId: string,
  referralRole?: ReferralPartnerRole | null,
) {
  if (referralRole === "CREATOR") {
    const profile = await prisma.creatorProfile.findFirst({
      where: { referralPartnerId },
      select: { accountId: true },
    });

    return profile?.accountId;
  }

  if (referralRole === "OPERATOR") {
    const profile = await prisma.operatorProfile.findFirst({
      where: { referralPartnerId },
      select: { accountId: true },
    });

    return profile?.accountId;
  }

  return undefined;
}

function buildLedgerEntry(
  input: ReferralCommissionLedgerInput,
  entry: {
    kind: ReferralLedgerKind;
    amountCents: number;
    accountId?: string;
    role?: BluePassAccountRole;
    metadata: Prisma.InputJsonObject;
  },
) {
  return {
    bookingInquiryId: input.bookingInquiryId,
    accountId: entry.accountId,
    referralPartnerId: input.referralPartnerId,
    role: entry.role,
    kind: entry.kind,
    amountCents: entry.amountCents,
    currency: "USD",
    status: "PENDING",
    metadata: entry.metadata,
  };
}

function usdToCents(value: number) {
  return Math.round(value * 100);
}
