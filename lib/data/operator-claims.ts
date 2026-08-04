export type ClaimableOperator = {
  slug: string;
  name: string;
  yachtSlugs: string[];
  representativeYachtSlug: string | null;
  websiteUrl: string;
  sourceLabel: string;
};

export const claimableOperators: ClaimableOperator[] = [
  {
    slug: "mermaid-liveaboards",
    name: "Mermaid Liveaboards",
    yachtSlugs: ["mermaid-i", "mermaid-ii"],
    representativeYachtSlug: "mermaid-i",
    websiteUrl: "https://www.mermaid-liveaboards.com",
    sourceLabel: "Mermaid Liveaboards public website",
  },
  {
    slug: "scuba-republic",
    name: "Scuba Republic",
    yachtSlugs: ["bajak", "capoeng", "jaya", "epica"],
    representativeYachtSlug: "bajak",
    websiteUrl: "https://scuba-republic.com",
    sourceLabel: "Scuba Republic public website",
  },
  {
    slug: "calico-jack",
    name: "Calico Jack",
    yachtSlugs: ["calico-jack"],
    representativeYachtSlug: "calico-jack",
    websiteUrl: "https://calicojackcharters.com",
    sourceLabel: "Calico Jack public website",
  },
];

export const claimableOperatorBySlug = Object.fromEntries(
  claimableOperators.map((operator) => [operator.slug, operator]),
) as Record<string, ClaimableOperator | undefined>;

export const claimableOperatorByYachtSlug = Object.fromEntries(
  claimableOperators.flatMap((operator) =>
    operator.yachtSlugs.map((yachtSlug) => [yachtSlug, operator]),
  ),
) as Record<string, ClaimableOperator | undefined>;
