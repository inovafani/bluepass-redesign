/**
 * The site's own absolute origin.
 *
 * Canonical tags, Open Graph URLs, JSON-LD `@id`s and the sitemap all need an absolute URL, and
 * every one of them is wrong in a way that costs rankings if it points at a preview deployment.
 * Same env precedence the auth emails already use (NEXT_PUBLIC_SITE_URL, then BLUEPASS_APP_URL),
 * with the production origin as the last resort — a canonical pointing at bluepass.co from a
 * preview build is a harmless duplicate; one pointing at a vercel.app URL from production is not.
 */
export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.BLUEPASS_APP_URL?.trim();
  return (configured || "https://bluepass.co").replace(/\/+$/, "");
}

export function absoluteUrl(path: string): string {
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}
