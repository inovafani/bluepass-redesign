import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/services/blog/site";

/**
 * robots.txt.
 *
 * Everything public is crawlable; the signed-in consoles and the API are not. The disallow list is
 * a crawl-budget instruction rather than a security control — these routes are all behind
 * `requireCurrentAdmin()` / session gates regardless, and a path in robots.txt is a public
 * statement that the path exists, which is why only the ones a crawler would otherwise waste time
 * on are listed.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/crm", "/operator", "/partner-portal", "/account", "/api/", "/reset-password"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/").replace(/\/$/, ""),
  };
}
