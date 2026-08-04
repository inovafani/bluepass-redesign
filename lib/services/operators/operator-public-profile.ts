import { ApplicationStatus, OperatorLeadStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { claimableOperatorBySlug } from "@/lib/data/operator-claims";
import { normalizeSlug } from "@/lib/services/operators/operator-leads";

export type OperatorPublicStatus =
  | "UNCLAIMED_PREVIEW"
  | "CLAIM_PENDING"
  | "VERIFIED";

export type OperatorPublicVisibility =
  | "OUTREACH_ONLY"
  | "PUBLIC_PREVIEW"
  | "PUBLIC_VERIFIED"
  | "DISCOVER_READY";

export type PublicOperatorProfile = {
  slug: string;
  name: string;
  status: OperatorPublicStatus;
  visibility: OperatorPublicVisibility;
  showClaimCta: boolean;
  showInDiscover: boolean;
  category?: string | null;
  region?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsappE164?: string | null;
  websiteUrl?: string | null;
  sourceLabel?: string | null;
  claimedYachtSlugs: string[];
};

type VisibilityInput = {
  status: string;
  claimedYachtSlugs?: string[] | null;
};

const approvedProfileStatuses: ApplicationStatus[] = [
  ApplicationStatus.APPROVED,
  ApplicationStatus.LIVE,
];
const previewLeadStatuses: OperatorLeadStatus[] = [
  OperatorLeadStatus.IMPORTED,
  OperatorLeadStatus.CLAIM_LINK_REQUESTED,
  OperatorLeadStatus.CLAIM_SUBMITTED,
  OperatorLeadStatus.MANUAL_REVIEW,
];

export async function getPublicOperatorProfile(
  operatorSlug: string,
): Promise<PublicOperatorProfile | null> {
  const slug = normalizeSlug(operatorSlug);
  if (!slug) return null;

  const profile = await prisma.operatorProfile.findFirst({
    where: {
      claimedOperatorSlug: slug,
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      status: true,
      companyName: true,
      whatsappE164: true,
      websiteUrl: true,
      claimedOperatorSlug: true,
      claimedYachtSlugs: true,
      claimedAt: true,
      account: {
        select: {
          email: true,
        },
      },
    },
  });

  if (profile) {
    const visibility = getOperatorDiscoverVisibility({
      status: profile.status,
      claimedYachtSlugs: profile.claimedYachtSlugs,
    });
    const isVerified = approvedProfileStatuses.includes(profile.status);

    return {
      slug,
      name:
        profile.companyName ??
        claimableOperatorBySlug[slug]?.name ??
        slugToTitle(slug),
      status: isVerified ? "VERIFIED" : "CLAIM_PENDING",
      visibility,
      showClaimCta: !isVerified,
      showInDiscover: visibility === "DISCOVER_READY",
      email: profile.account.email,
      whatsappE164: profile.whatsappE164,
      websiteUrl: profile.websiteUrl,
      claimedYachtSlugs: profile.claimedYachtSlugs.map(normalizeSlug).filter(Boolean),
    };
  }

  const staticOperator = claimableOperatorBySlug[slug];
  if (staticOperator) {
    return {
      slug: staticOperator.slug,
      name: staticOperator.name,
      status: "UNCLAIMED_PREVIEW",
      visibility: "PUBLIC_PREVIEW",
      showClaimCta: true,
      showInDiscover: false,
      websiteUrl: staticOperator.websiteUrl,
      sourceLabel: staticOperator.sourceLabel,
      claimedYachtSlugs: staticOperator.yachtSlugs,
    };
  }

  const lead = await prisma.operatorLead.findUnique({
    where: { slug },
    select: {
      slug: true,
      name: true,
      category: true,
      region: true,
      email: true,
      phone: true,
      websiteUrl: true,
      source: true,
      status: true,
      claimUrl: true,
    },
  });

  if (!lead) return null;

  const visibility = previewLeadStatuses.includes(lead.status)
    ? "PUBLIC_PREVIEW"
    : "OUTREACH_ONLY";

  return {
    slug: lead.slug,
    name: lead.name,
    status: "UNCLAIMED_PREVIEW",
    visibility,
    showClaimCta: visibility === "PUBLIC_PREVIEW",
    showInDiscover: false,
    category: lead.category,
    region: lead.region,
    email: lead.email,
    phone: lead.phone,
    websiteUrl: lead.websiteUrl,
    sourceLabel: `${lead.source} operator lead`,
    claimedYachtSlugs: [],
  };
}

export function getOperatorDiscoverVisibility(
  input: VisibilityInput,
): OperatorPublicVisibility {
  if (!approvedProfileStatuses.includes(input.status as ApplicationStatus)) {
    return "PUBLIC_PREVIEW";
  }

  const claimedYachtSlugs = input.claimedYachtSlugs?.map(normalizeSlug).filter(Boolean) ?? [];
  return claimedYachtSlugs.length > 0 ? "DISCOVER_READY" : "PUBLIC_VERIFIED";
}

function slugToTitle(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
