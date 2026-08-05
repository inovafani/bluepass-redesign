import { redirect } from "next/navigation";

/**
 * The site root sends visitors to Discover — the first entry in the nav and the
 * page a first load should land on.
 *
 * The marketing page that used to live here now has its own route at /explore;
 * nothing was deleted. This stays a plain redirect rather than rendering
 * Discover's tree at "/" so each page keeps exactly one URL.
 *
 * Deliberately `redirect` (307) and not `permanentRedirect` (308): a permanent
 * redirect gets cached hard by browsers, and which page greets a visitor is
 * still an open question here. Swap it if the landing page settles.
 */
export default function Page() {
  redirect("/discover");
}
