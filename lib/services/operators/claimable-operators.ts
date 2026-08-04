import type { ClaimableOperator } from "@/lib/data/operator-claims";
import { claimableOperatorBySlug } from "@/lib/data/operator-claims";
import {
  findOperatorLeadBySlug,
  normalizeSlug,
} from "@/lib/services/operators/operator-leads";

export async function getClaimableOperator(
  operatorSlug: string,
): Promise<ClaimableOperator | undefined> {
  const slug = normalizeSlug(operatorSlug);
  const staticOperator = claimableOperatorBySlug[slug];

  if (staticOperator) {
    return staticOperator;
  }

  const lead = await findOperatorLeadBySlug(slug);

  if (!lead) {
    return undefined;
  }

  return {
    slug: lead.slug,
    name: lead.name,
    yachtSlugs: [],
    representativeYachtSlug: null,
    websiteUrl: lead.websiteUrl ?? "",
    sourceLabel: `${lead.source} operator lead`,
  };
}

export function getClaimableOperatorBackHref(operator: ClaimableOperator) {
  return operator.representativeYachtSlug
    ? `/yachts/${operator.representativeYachtSlug}`
    : "/operators";
}
