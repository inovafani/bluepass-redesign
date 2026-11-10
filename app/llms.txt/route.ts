import { absoluteUrl } from "@/lib/services/blog/site";

export const revalidate = 3600;

/**
 * /llms.txt: a plain-text summary for AI assistants and crawlers.
 *
 * Says only what the public site already says. It does not mention live availability or prices,
 * because those change per operator and are not Bluepass's to promise from a static file.
 */
export function GET() {
  const body = `# Bluepass

> Bluepass connects travellers with vetted ocean operators for surf, sail and dive trips, booked at the price you see. A fixed 5% of every fare goes to ocean conservation.

## Pages
- [Trips](${absoluteUrl("/")}): browse trips from Bluepass operators
- [Explore](${absoluteUrl("/explore")}): how Bluepass works and the operators in the network
- [Conservation](${absoluteUrl("/conservation")}): where the 5% goes
- [Partners](${absoluteUrl("/partners")}): the partner and creator programme
- [Blog](${absoluteUrl("/blog")}): guides and conservation reporting

## Policies
- [Privacy](${absoluteUrl("/privacy")})
- [Terms](${absoluteUrl("/terms")})
- [Data deletion](${absoluteUrl("/data-deletion")})
`;
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
