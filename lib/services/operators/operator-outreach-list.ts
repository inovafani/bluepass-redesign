import type { OperatorLeadStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export type OperatorOutreachFilter =
  | "all"
  | "needs_outreach"
  | "pending_claim"
  | "approved"
  | "declined";

export const operatorOutreachFilterOptions: {
  key: OperatorOutreachFilter;
  label: string;
  statuses?: OperatorLeadStatus[];
}[] = [
  { key: "all", label: "All leads" },
  { key: "needs_outreach", label: "Needs outreach", statuses: ["IMPORTED"] },
  {
    key: "pending_claim",
    label: "Pending claim",
    statuses: ["CLAIM_LINK_REQUESTED", "CLAIM_SUBMITTED", "MANUAL_REVIEW"],
  },
  { key: "approved", label: "Approved / live", statuses: ["APPROVED", "LIVE"] },
  { key: "declined", label: "Declined", statuses: ["DECLINED"] },
];

export type OperatorOutreachPaginationItem = number | "ellipsis";

export function buildOperatorOutreachPaginationItems(
  page: number,
  totalPages: number,
): OperatorOutreachPaginationItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (page <= 4) {
    return [1, 2, 3, 4, "ellipsis", totalPages];
  }

  if (page >= totalPages - 3) {
    return [
      1,
      "ellipsis",
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    "ellipsis",
    page - 2,
    page - 1,
    page,
    page + 1,
    page + 2,
    "ellipsis",
    totalPages,
  ];
}

export async function loadOperatorOutreachList({
  filter = "all",
  q = "",
  page = "1",
  pageSize = 20,
  baseUrl,
}: {
  filter?: string;
  q?: string;
  page?: string | number;
  pageSize?: string | number;
  baseUrl?: string;
}) {
  const activeFilter = normalizeFilter(filter);
  const search = q.trim();
  const normalizedPageSize = normalizePageSize(pageSize);
  const currentPage = normalizePage(page);
  const canonicalBaseUrl = resolveBaseUrl(baseUrl);
  const filterOption = operatorOutreachFilterOptions.find(
    (option) => option.key === activeFilter,
  );
  const where = {
    ...(filterOption?.statuses?.length
      ? { status: { in: filterOption.statuses } }
      : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { slug: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
            { region: { contains: search, mode: "insensitive" as const } },
            { category: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [statusGroups, filteredTotal, leads] = await Promise.all([
    prisma.operatorLead.groupBy({
      by: ["status"],
      _count: { _all: true },
      orderBy: { status: "asc" },
    }),
    prisma.operatorLead.count({ where }),
    prisma.operatorLead.findMany({
      where,
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      skip: (currentPage - 1) * normalizedPageSize,
      take: normalizedPageSize,
      select: {
        id: true,
        slug: true,
        name: true,
        category: true,
        region: true,
        email: true,
        phone: true,
        status: true,
        lastOutreachAt: true,
        updatedAt: true,
      },
    }),
  ]);

  const countsByStatus = new Map<OperatorLeadStatus, number>(
    statusGroups.map((group) => [group.status, group._count._all]),
  );

  return {
    activeFilter,
    search,
    page: currentPage,
    pageSize: normalizedPageSize,
    filteredTotal,
    totalPages: Math.max(1, Math.ceil(filteredTotal / normalizedPageSize)),
    filterOptions: operatorOutreachFilterOptions,
    totals: {
      all: sumStatuses(countsByStatus),
      needsOutreach: sumStatuses(countsByStatus, ["IMPORTED"]),
      pendingClaim: sumStatuses(countsByStatus, [
        "CLAIM_LINK_REQUESTED",
        "CLAIM_SUBMITTED",
        "MANUAL_REVIEW",
      ]),
      approved: sumStatuses(countsByStatus, ["APPROVED", "LIVE"]),
      declined: sumStatuses(countsByStatus, ["DECLINED"]),
    },
    leads: leads.map((lead) => ({
      ...lead,
      claimUrl: `${canonicalBaseUrl}/operator/claim/start/${lead.slug}`,
      publicUrl: `${canonicalBaseUrl}/operators/${lead.slug}`,
    })),
  };
}

function normalizeFilter(filter: string): OperatorOutreachFilter {
  return operatorOutreachFilterOptions.some((option) => option.key === filter)
    ? (filter as OperatorOutreachFilter)
    : "all";
}

function normalizePage(page: string | number) {
  const parsed = typeof page === "number" ? page : Number.parseInt(page, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return parsed;
}

function normalizePageSize(pageSize: string | number) {
  const parsed =
    typeof pageSize === "number" ? pageSize : Number.parseInt(pageSize, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 20;
  return Math.min(parsed, 1000);
}

function resolveBaseUrl(baseUrl?: string) {
  return (
    baseUrl?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.BLUEPASS_APP_URL?.trim() ||
    "https://bluepass.co"
  ).replace(/\/$/, "");
}

function sumStatuses(
  countsByStatus: Map<OperatorLeadStatus, number>,
  statuses?: OperatorLeadStatus[],
) {
  if (!statuses) {
    return Array.from(countsByStatus.values()).reduce((sum, count) => sum + count, 0);
  }

  return statuses.reduce(
    (sum, status) => sum + (countsByStatus.get(status) ?? 0),
    0,
  );
}
