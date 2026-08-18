/**
 * The admin console's navigation, as data.
 *
 * Every surface added later (commission ledger, operator list, traveller
 * support) is a row appended here — the nav, the section index and the active
 * highlight all read from this one array, so none of them carry an assumption
 * about how many sections exist.
 */
export type AdminSection = {
  href: string;
  label: string;
  /** One line of "what is this for", shown on the section index. */
  blurb: string;
  /**
   * Which live counter, if any, this section shows next to its label. Sections
   * with nothing queueing up behind them simply omit it.
   */
  counter?: "pendingApprovals";
};

export const ADMIN_SECTIONS: AdminSection[] = [
  {
    href: "/admin/approvals",
    label: "Approvals",
    blurb:
      "Operator claims and creator/operator applications waiting on a human decision. Approving a claim also releases the operator's own profile.",
    counter: "pendingApprovals",
  },
  {
    href: "/admin/operators/new",
    label: "New operator",
    blurb:
      "Onboard an operator you have already closed over phone or email — real payout details, live from the moment you save it.",
  },
  {
    href: "/admin/payouts",
    label: "Payouts & Ledger",
    blurb:
      "Whether the settlement crons ran, and every commission and operator-payout line behind them — Australia, Indonesia, and this app's own referral ledger.",
  },
];

/**
 * Longest-prefix match, so `/admin/operators/new` highlights the operators
 * section rather than every section whose href it happens to start with, and
 * `/admin` itself highlights nothing.
 */
export function activeAdminSection(pathname: string) {
  return ADMIN_SECTIONS.filter((section) => pathname === section.href || pathname.startsWith(`${section.href}/`)).sort(
    (a, b) => b.href.length - a.href.length,
  )[0];
}
