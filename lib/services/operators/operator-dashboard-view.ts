import { claimableOperatorBySlug } from "@/lib/data/operator-claims";

type OperatorDashboardProfile = {
  status?: string | null;
  companyName?: string | null;
  claimedOperatorSlug?: string | null;
  claimedYachtSlugs?: string[] | null;
};

export type OperatorDashboardClaimView = {
  companyName: string;
  claimedYachtSlugs: string[];
  primaryHref: string;
  inventoryLabel: string;
};

export function buildOperatorDashboardClaimView(
  profile?: OperatorDashboardProfile | null,
): OperatorDashboardClaimView | null {
  const operatorSlug = profile?.claimedOperatorSlug;
  if (profile?.status !== "APPROVED" || !operatorSlug) return null;

  const staticOperator = claimableOperatorBySlug[operatorSlug];
  const claimedYachtSlugs = profile.claimedYachtSlugs?.length
    ? profile.claimedYachtSlugs
    : staticOperator?.yachtSlugs ?? [];
  const representativeYachtSlug =
    staticOperator?.representativeYachtSlug ?? claimedYachtSlugs[0] ?? null;

  return {
    companyName:
      profile.companyName ?? staticOperator?.name ?? titleFromSlug(operatorSlug),
    claimedYachtSlugs,
    primaryHref: representativeYachtSlug
      ? `/yachts/${representativeYachtSlug}`
      : `/operators/${operatorSlug}`,
    inventoryLabel: claimedYachtSlugs.length
      ? `${claimedYachtSlugs.length} claimed vessel${
          claimedYachtSlugs.length === 1 ? "" : "s"
        } connected to this account.`
      : "Your operator profile is approved. Add trips or claimed vessels to become Discover-ready.",
  };
}

function titleFromSlug(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
