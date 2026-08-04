import { NextResponse } from "next/server";
import { buildBluePassCatalogSnapshot } from "@/lib/services/kai-core/client";

// Temporary while the site has no Indonesia/Australia switch yet: the widget's opening greeting is
// mounted globally (app/layout.tsx), with no per-page region context, so surfacing Indonesia's
// static regions there reads as off-focus while the business is Australia-first. Remove this filter
// once the planned region switch lands and the greeting can be region-aware instead.
const TEMPORARILY_HIDDEN_GREETING_REGIONS = new Set(["komodo", "raja ampat"]);

// Same temporary Australia-first period as the filter above: without this, the greeting's
// suggested-reply chips would have nothing to show at all once Indonesia's regions are hidden and
// no other AU OperatorListing is live yet. Gold Coast is our one real, currently-bookable location
// (Boattime Yacht Charters) - honest to lead with, and reads naturally in the "Find a {region} trip"
// button template (unlike "Australia", which needs "an" not "a"). Remove alongside the filter above.
const TEMPORARY_DEFAULT_GREETING_REGION = "Gold Coast";

// Distinct regions currently live in the catalog (static yachts + live operator listings) - the
// same source of truth Kai's own reply engine uses. Lets the widget's greeting reflect whatever
// regions actually have inventory today, instead of a hardcoded destination list that goes stale
// every time a new region/operator is added.
export async function GET() {
  try {
    const snapshot = await buildBluePassCatalogSnapshot();
    const regions = Array.from(
      new Set([
        TEMPORARY_DEFAULT_GREETING_REGION,
        ...snapshot.map((item) => item.region).filter((region): region is string => Boolean(region)),
      ]),
    ).filter((region) => !TEMPORARILY_HIDDEN_GREETING_REGIONS.has(region.toLowerCase()));

    return NextResponse.json({ regions });
  } catch (error) {
    console.warn("kai.regions_failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : "Unable to fetch catalog regions",
    });

    return NextResponse.json({ regions: [] });
  }
}
