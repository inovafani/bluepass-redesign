import { prisma } from "@/lib/db/prisma";
import {
  listAcrossStatuses,
  section,
  toIndonesiaLedgerRow,
  type LedgerRowView,
  type SectionResult,
} from "@/lib/services/admin/payouts";
import {
  listKaiCoreBluePassLedger,
  type KaiCoreBluePassLedgerEntry,
} from "@/lib/services/kai-core/client";
import type { OperatorProfileView } from "@/lib/services/operator/guard";

/**
 * Which booking source, if any, this operator's history can actually be read from.
 *
 * Kept as its own pure function because the branch is the load-bearing part of the dashboard and
 * each arm is a different promise to the operator:
 *
 * - `kai-tenant`  — the operator has a Kai Tenant of their own (`kaiTenantSlug`), so their ledger is
 *                   one tenant-scoped call. Most live `OperatorProfile` rows are this kind.
 * - `rezdy-agent` — a Rezdy-Agent operator discovered by the Discover sync. Kai's AU ledger
 *                   endpoints are tenant-scoped and this operator has no tenant of its own, so
 *                   there is no per-operator lookup to make. Their bookings exist; we cannot read
 *                   them from here yet.
 * - `unlinked`    — manually onboarded, not yet attached to any live booking source.
 *
 * The last two are not empty states and must never render as an empty table. "No rows" and "we
 * cannot see your rows" are different sentences, and only one of them is true here.
 */
export type OperatorBookingSource =
  | { kind: "kai-tenant"; tenantSlug: string }
  | { kind: "rezdy-agent"; rezdySupplierId: string }
  | { kind: "unlinked" };

/**
 * `kaiTenantSlug` wins when both are set. A profile carrying both is an operator whose Rezdy
 * products were matched into a profile that also has its own Kai tenant, and the tenant is the one
 * with a ledger behind it — preferring the source we can actually read is what keeps that operator
 * off the "not available yet" message.
 */
export function operatorBookingSource(profile: {
  kaiTenantSlug: string | null;
  rezdySupplierId: string | null;
}): OperatorBookingSource {
  if (profile.kaiTenantSlug) {
    return { kind: "kai-tenant", tenantSlug: profile.kaiTenantSlug };
  }

  if (profile.rezdySupplierId) {
    return { kind: "rezdy-agent", rezdySupplierId: profile.rezdySupplierId };
  }

  return { kind: "unlinked" };
}

/**
 * The source, plus the rows when there are rows to have. Flattened onto the same `kind` the source
 * carries rather than nested under it, so one `switch` in the component covers both "which of the
 * three situations is this" and "did the fetch work".
 */
export type OperatorBookings =
  | (Extract<OperatorBookingSource, { kind: "kai-tenant" }> & {
      result: SectionResult<LedgerRowView[]>;
    })
  | Extract<OperatorBookingSource, { kind: "rezdy-agent" | "unlinked" }>;

type LedgerLoader = typeof listKaiCoreBluePassLedger;

/**
 * The operator's own ledger lines, newest first, across every status.
 *
 * Unfiltered on purpose, where the admin page defaults to PENDING: an admin is hunting for money
 * that has not moved, an operator is reading their own history and a page that silently hid every
 * finalised booking would look like their completed work had vanished.
 *
 * Rows are shaped by `toIndonesiaLedgerRow` rather than a second normaliser, then stripped of their
 * `action`. That field means "an admin may release this payout by hand", and the actions behind it
 * are admin-gated, so an operator rendering one could only ever produce a button that refuses. The
 * decision to pay is the admin console's; this page reports it.
 */
export async function loadOperatorBookings(
  profile: Pick<OperatorProfileView, "kaiTenantSlug" | "rezdySupplierId">,
  listLedger: LedgerLoader = listKaiCoreBluePassLedger,
): Promise<OperatorBookings> {
  const source = operatorBookingSource(profile);

  if (source.kind !== "kai-tenant") {
    return source;
  }

  const { tenantSlug } = source;

  return {
    ...source,
    result: await section(async () => {
      const entries = await listAcrossStatuses<KaiCoreBluePassLedgerEntry>("ALL", (status) =>
        listLedger({ tenantSlug, status }),
      );

      return entries.map((entry) => ({ ...toIndonesiaLedgerRow(entry, tenantSlug), action: null }));
    }),
  };
}

export type OperatorListingRow = {
  id: string;
  title: string;
  status: string;
  region: string;
  category: string;
  priceSignal: string | null;
  publishedAt: Date | null;
};

/**
 * The operator's listings, read-only.
 *
 * Archived rows are included rather than filtered out: an operator whose listing was pulled needs
 * to see that it was, and an archived listing quietly missing from this list would read as a bug in
 * the page rather than as a decision someone made.
 */
export async function loadOperatorListings(operatorProfileId: string): Promise<OperatorListingRow[]> {
  return prisma.operatorListing.findMany({
    where: { operatorProfileId },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      title: true,
      status: true,
      region: true,
      category: true,
      priceSignal: true,
      publishedAt: true,
    },
  });
}
