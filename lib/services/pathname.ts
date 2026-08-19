/**
 * The request header `middleware.ts` stamps onto every console request (`/admin/*` and
 * `/operator/*`).
 *
 * A Next.js layout is never told which page is rendering inside it, so the auth gates in
 * `app/admin/layout.tsx` and `app/operator/layout.tsx` have no way to build an accurate
 * `/login?next=…` on their own — a visitor deep-linked to `/admin/operators/new` would be bounced
 * to the section root after signing in. The middleware copies the real pathname into a request
 * header the layout can read back.
 *
 * This module deliberately has zero imports: `middleware.ts` runs on the edge runtime, so anything
 * it pulls in gets bundled for the edge. Keeping the constant here rather than in either guard is
 * what stops Prisma being dragged into the middleware bundle.
 */
export const CONSOLE_PATHNAME_HEADER = "x-bluepass-pathname";

/**
 * The route prefixes that are consoles rather than marketing pages.
 *
 * Each console owns its whole viewport: its own rail, its own brand mark, its own footer. The site
 * chrome has to stand aside for all of them, and there is now more than one — `/operator` shipped
 * after `/admin` and inherited none of its treatment, so the marketing nav painted over the
 * operator rail and the Kai launcher floated across an operator's own payout figures. `/creator`
 * repeated the same miss when it shipped after this comment was already written above it.
 */
const CONSOLE_PATHNAME_PREFIXES = ["/admin", "/operator", "/creator"];

/**
 * Whether `pathname` is inside a console area.
 *
 * Lives here, next to the header constant, so the components that stand aside share one list
 * instead of each carrying its own `startsWith` — the third console area should be one entry above,
 * not another grep for "/admin" across `components/`.
 *
 * Matches the section root and everything under it, never a route that merely starts with the same
 * characters: `/administrators` is a marketing page and must keep its nav.
 */
export function isConsolePathname(pathname: string) {
  return CONSOLE_PATHNAME_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
