import { prisma } from "@/lib/db/prisma";
import { getKaiCorePlatformStats, type KaiCorePlatformStats } from "@/lib/services/kai-core/client";
import { section, type SectionResult } from "@/lib/services/admin/payouts";

/** One currency's worth of the numbers the overview page actually shows. */
export type OverviewMoneyRow = {
  currency: string;
  conservationCents: number;
  operatorPayoutCents: number;
  platformCommissionCents: number;
  creatorCommissionCents: number;
};

export type AdminOverviewStats = {
  kaiStats: SectionResult<KaiCorePlatformStats>;
  moneyByCurrency: OverviewMoneyRow[];
  bookingCount: number;
  liveOperatorCount: number;
  approvedCreatorCount: number;
};

const KIND_FIELD: Record<string, keyof Omit<OverviewMoneyRow, "currency">> = {
  CONSERVATION_ALLOCATION: "conservationCents",
  OPERATOR_PAYOUT_PLACEHOLDER: "operatorPayoutCents",
  BLUEPASS_PLATFORM_COMMISSION: "platformCommissionCents",
  CREATOR_COMMISSION_ESTIMATE: "creatorCommissionCents",
};

/**
 * Folds Kai's per-kind totals (already summed across every tenant in that region) into one row per
 * currency. Deliberately never adds two different currencies together — AUD and USD are not the
 * same number, and pretending otherwise would put a fabricated figure on an investor-facing page,
 * exactly what this whole project has held a hard line against.
 *
 * AU only, on purpose (2026-08-19): every one of Indonesia's 1,867 FINALIZED ledger rows turned out
 * to belong to an @example.com test traveller - two Kai test files (bluepass-stripe.test.ts,
 * bluepass-inquiry-repository.test.ts) write real FINALIZED rows against production with no cleanup
 * hook at all, unlike the AU-side tests, which already went through this exact fix once before (see
 * the Milestone 2 "106 leftover rows" note in [[bluepass-payment-settlement-gap]]). Indonesia's
 * numbers go back on this page once that's fixed and the polluted rows are cleared - showing them
 * now would put fabricated revenue on an investor-facing page. AU's own FINALIZED rows were checked
 * the same way and are clean (4 rows, all real gmail.com travellers).
 */
export function foldMoneyByCurrency(stats: KaiCorePlatformStats): OverviewMoneyRow[] {
  const rows = new Map<string, OverviewMoneyRow>();

  for (const region of [stats.au]) {
    for (const total of region.totalsByKindAndCurrency) {
      const field = KIND_FIELD[total.kind];
      if (!field) continue;

      const row =
        rows.get(total.currency) ??
        ({
          currency: total.currency,
          conservationCents: 0,
          operatorPayoutCents: 0,
          platformCommissionCents: 0,
          creatorCommissionCents: 0,
        } satisfies OverviewMoneyRow);

      row[field] += total.amountCents;
      rows.set(total.currency, row);
    }
  }

  return Array.from(rows.values()).sort((a, b) => a.currency.localeCompare(b.currency));
}

/**
 * What the admin overview page needs: real money totals (Kai, isolated so an unreachable Kai reports
 * as unreachable rather than as zero revenue) plus the two headcounts this app already owns locally.
 */
export async function loadAdminOverviewStats(): Promise<AdminOverviewStats> {
  const [kaiStats, liveOperatorCount, approvedCreatorCount] = await Promise.all([
    section(() => getKaiCorePlatformStats()),
    prisma.operatorProfile.count({ where: { status: "LIVE" } }),
    prisma.creatorProfile.count({ where: { status: "APPROVED" } }),
  ]);

  const moneyByCurrency = kaiStats.ok ? foldMoneyByCurrency(kaiStats.data) : [];
  // AU only - see foldMoneyByCurrency's note on why Indonesia is excluded for now.
  const bookingCount = kaiStats.ok ? kaiStats.data.au.bookingCount : 0;

  return { kaiStats, moneyByCurrency, bookingCount, liveOperatorCount, approvedCreatorCount };
}
