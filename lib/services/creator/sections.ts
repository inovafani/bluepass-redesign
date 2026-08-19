/** The creator area's navigation, as data — the same shape as OPERATOR_SECTIONS. */
export type CreatorSection = {
  href: string;
  label: string;
};

export const CREATOR_SECTIONS: CreatorSection[] = [{ href: "/creator", label: "Dashboard" }];

/** Longest-prefix match, so a future `/creator/links` highlights its section. */
export function activeCreatorSection(pathname: string) {
  return CREATOR_SECTIONS.filter(
    (section) => pathname === section.href || pathname.startsWith(`${section.href}/`),
  ).sort((a, b) => b.href.length - a.href.length)[0];
}
