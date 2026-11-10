import { absoluteUrl, siteUrl } from "@/lib/services/blog/site";

/**
 * Site-wide structured data: who Bluepass is, on every page.
 *
 * Same Organization `@id` the blog's article markup already points at, so the two are one entity
 * rather than two near-duplicates. Nothing here claims a rating, a price, an address or live
 * availability: only what the footer and the verified Instagram account already say. Add a field
 * only when the site itself shows it.
 */
export const INSTAGRAM_URL = "https://www.instagram.com/bluepasslive/";

export function buildSiteJsonLd() {
  const organisationId = `${siteUrl()}/#organization`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organisationId,
        name: "Bluepass",
        url: siteUrl(),
        logo: absoluteUrl("/bluepass-logo-full.png"),
        description: "Vetted operators for surf, sail and dive, booked at the price you see.",
        sameAs: [INSTAGRAM_URL],
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl()}/#website`,
        name: "Bluepass",
        url: siteUrl(),
        publisher: { "@id": organisationId },
      },
    ],
  };
}
