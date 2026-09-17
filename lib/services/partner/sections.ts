/** The partner area's navigation, as data — the same shape as OPERATOR_SECTIONS. */
export type PartnerSection = {
  href: string;
  label: string;
};

export const PARTNER_SECTIONS: PartnerSection[] = [{ href: "/partner-portal", label: "Dashboard" }];

/** Longest-prefix match, so a future `/partner-portal/links` highlights its section. */
export function activePartnerSection(pathname: string) {
  return PARTNER_SECTIONS.filter(
    (section) => pathname === section.href || pathname.startsWith(`${section.href}/`),
  ).sort((a, b) => b.href.length - a.href.length)[0];
}
