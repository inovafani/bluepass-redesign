/**
 * Discover page content. Photography is served from /public — the layout is
 * sized for 4:5 (trips) and 4:3 (regions), so `img` fields are cropped to fit.
 *
 * Ningaloo and South Australia have no location photography yet; both fall back
 * to the nearest reef / open-coast frame we hold.
 *
 * The per-trip editorial (summary, itinerary, departures, operator notes) is
 * placeholder copy written to the right shape and length for the trip sheet —
 * it is not sourced from real operators. Swap it wholesale when the real
 * inventory lands; the sheet reads every field off this file.
 */

/** The unfiltered region, used as the label when no region is selected. */
export const ALL_REGIONS = "All Australia";

export type Category = "Dive" | "Sail & Yacht" | "Wildlife" | "Expedition";

export const categories: Category[] = ["Dive", "Sail & Yacht", "Wildlife", "Expedition"];

/** Icon glyphs, drawn in the same hairline style as the home-page icons. */
export const categoryIcon: Record<Category, string> = {
  Dive: "M3 15c2-3 4-3 6 0s4 3 6 0 4-3 6 0M12 3v6M9 6l3-3 3 3",
  "Sail & Yacht": "M12 3v13M12 6l6 10H12M10 16H4l3-5M3 20h18",
  Wildlife: "M4 14c3-5 7-7 11-7 3 0 5 1 5 3s-2 4-5 5c-4 1-8 0-11-1zM4 14l-2 5M15 10a1 1 0 1 0 .01 0",
  Expedition: "M12 3l2.5 5.5L20 11l-5.5 2.5L12 19l-2.5-5.5L4 11l5.5-2.5z",
};

export type Region = {
  slug: string;
  name: string;
  trips: number;
  img: string;
};

export const regions: Region[] = [
  { slug: "great-barrier-reef", name: "Great Barrier Reef", trips: 1, img: "/great-barrier.jpg" },
  { slug: "whitsundays", name: "Whitsundays", trips: 1, img: "/whitsundays-2.jpg" },
  { slug: "hervey-bay", name: "Hervey Bay", trips: 1, img: "/hervey-bay-2.jpg" },
  { slug: "ningaloo", name: "Ningaloo", trips: 1, img: "/great-barrier-3.jpg" },
  { slug: "sydney-harbour", name: "Sydney Harbour", trips: 1, img: "/sidney.jpg" },
  { slug: "south-australia", name: "South Australia", trips: 1, img: "/gold-coast-2.jpg" },
];

/** One row of the day-by-day shape of a trip. */
export type TripDay = { label: string; title: string; desc: string };

/**
 * How the 5% is divided for this trip, in percent of the contribution. Drives
 * the split bar in the trip sheet; the three names match the home page's
 * Protect / Restore / Uplift language.
 */
export type ImpactSplit = { protect: number; restore: number; uplift: number };

export type Trip = {
  slug: string;
  name: string;
  category: Category;
  region: string;
  /**
   * `rating`/`reviews`/`quote`/`quoteBy` are optional so a real, freshly-synced
   * operator (e.g. from Rezdy) can render honestly with no star rating and no
   * testimonial rather than a fabricated one - see TripGrid/TripSheet, which
   * hide each block when the field is absent instead of showing a fake value.
   * The 6 curated trips below set all of these, so nothing changes for them.
   */
  rating?: number;
  reviews?: number;
  operator: string;
  duration: string;
  detail: string;
  impact: string;
  quote?: string;
  /** Attribution for `quote`, shown in the sheet's pull-quote. */
  quoteBy?: string;
  price: number;
  eco: boolean;
  scarcity?: string;
  img: string;

  /* ---- sheet-only content ---------------------------------------------- */
  summary: string;
  /** Short "why this one" lines — 4 reads best in the two-column layout. Section hides if empty. */
  highlights: string[];
  /** Day-by-day shape of the trip. Section hides if empty - never fabricate a real itinerary. */
  itinerary: TripDay[];
  includes: string[];
  /** Next open departures, in the same window as `whenOptions`. Block hides if empty. */
  departures: string[];
  /** Why this operator is on the platform. Optional - omit rather than invent a claim. */
  operatorNote?: string;
  impactSplit: ImpactSplit;
  /** Named recipient of the 5%, shown against the computed figure. */
  fundsPartner: string;
};

export const trips: Trip[] = [
  {
    slug: "ribbon-reefs-run",
    name: "Ribbon Reefs Run",
    category: "Dive",
    region: "Great Barrier Reef",
    rating: 4.9,
    reviews: 236,
    operator: "Coral Sea Lines",
    duration: "4 days",
    detail: "14 dives",
    impact: "Grows nursery corals with Reef Restoration Foundation",
    quote: "Cod Hole at 7am with nobody else on the site. The crew ran three dives before lunch.",
    quoteBy: "Tash & Dev, Melbourne",
    price: 2190,
    eco: true,
    img: "/great-barrier-5.jpg",
    summary:
      "Four days running the outer ribbons north of Cairns, where the reef wall drops into blue water and the dive sites sit hours from the day-boat fleet. Fourteen dives, small groups, and a crew who plan the day around the tide rather than the timetable.",
    highlights: [
      "Cod Hole and Steve's Bommie before the day boats arrive",
      "Two night dives, both from the back deck",
      "Nitrox included, no surcharge on any dive",
      "Maximum 16 divers with four guides in the water",
    ],
    itinerary: [
      { label: "Day 01", title: "Cairns → outer ribbons", desc: "Afternoon steam out, check dive at dusk, briefing over dinner." },
      { label: "Day 02", title: "Ribbon Reef No. 10", desc: "Four dives including Cod Hole at first light, then a night dive." },
      { label: "Day 03", title: "Steve's Bommie & Pixie Pinnacle", desc: "Four dives on the pinnacles, the deepest water of the trip." },
      { label: "Day 04", title: "Inner reef → Cairns", desc: "Two shallow dives over coral gardens, alongside by mid-afternoon." },
    ],
    includes: ["All 14 dives", "Nitrox fills", "Tanks & weights", "All meals aboard", "Twin-share cabin"],
    departures: ["12 Oct 2026", "26 Oct 2026", "09 Nov 2026"],
    operatorNote:
      "Coral Sea Lines has run the ribbons for 19 years and reports its own reef-health surveys to AIMS after every trip.",
    impactSplit: { protect: 55, restore: 30, uplift: 15 },
    fundsPartner: "Reef Restoration Foundation",
  },
  {
    slug: "humpback-highway",
    name: "Humpback Highway",
    category: "Wildlife",
    region: "Hervey Bay",
    rating: 4.9,
    reviews: 503,
    operator: "Hervey Bay Whale Co.",
    duration: "3 days",
    detail: "6 encounters",
    impact: "Funds fluke-ID research along the east-coast migration",
    quote: "Our 8-year-old heard whales sing through the hydrophone for twenty minutes straight.",
    quoteBy: "The Nguyens, Brisbane",
    price: 890,
    eco: true,
    img: "/hervey-bay-1.jpg",
    summary:
      "Hervey Bay is the one place on the east-coast migration where humpbacks stop to rest, and mothers bring calves close enough to look you in the eye. Three days in the bay with a research-grade hydrophone aboard and no fixed run sheet.",
    highlights: [
      "Six in-water or alongside encounters across three days",
      "Hydrophone piped through the deck speakers",
      "Fluke-ID photos you take are logged to the research catalogue",
      "Family-rated, the calmest whale water in Australia",
    ],
    itinerary: [
      { label: "Day 01", title: "Platypus Bay", desc: "Slow drift along the western shore where mothers and calves rest." },
      { label: "Day 02", title: "The full bay", desc: "Whichever pods are singing, the skipper follows the hydrophone." },
      { label: "Day 03", title: "Morning run → Urangan", desc: "Dawn encounter, then back to the marina before lunch." },
    ],
    includes: ["All encounters", "Wetsuit & mask hire", "Lunch and morning tea", "Hydrophone sessions", "Marine-biologist guide"],
    departures: ["08 Oct 2026", "22 Oct 2026", "05 Nov 2026"],
    operatorNote:
      "Hervey Bay Whale Co. holds a Level 2 whale-watch permit and has contributed fluke IDs to the east-coast catalogue since 2011.",
    impactSplit: { protect: 45, restore: 20, uplift: 35 },
    fundsPartner: "the east-coast fluke-ID catalogue",
  },
  {
    slug: "whitehaven-under-sail",
    name: "Whitehaven Under Sail",
    category: "Sail & Yacht",
    region: "Whitsundays",
    rating: 4.8,
    reviews: 412,
    operator: "Saltline Sailing Co.",
    duration: "3 days",
    detail: "5 anchorages",
    impact: "Funds Tangaroa Blue beach & ghost-net clean-ups",
    quote: "Hill Inlet at the tide turn from the bow, then dinner at anchor with nobody around.",
    quoteBy: "Priya & Sam, Perth",
    price: 1150,
    eco: true,
    img: "/whitsundays-3.jpg",
    summary:
      "Three days under sail through the Whitsunday passage, timed so you reach Hill Inlet on the turning tide and Whitehaven at the hour the day-trippers leave. Five anchorages, no marina nights, and a boat small enough to take the quiet bays.",
    highlights: [
      "Hill Inlet on the tide turn, the sandbanks at their sharpest",
      "Whitehaven Beach after the last day boat has gone",
      "Snorkel stops at Blue Pearl and Manta Ray Bay",
      "Sail her yourself, or don't. The crew is easy either way",
    ],
    itinerary: [
      { label: "Day 01", title: "Airlie Beach → Nara Inlet", desc: "Afternoon sail across the passage, anchor for the night." },
      { label: "Day 02", title: "Whitehaven & Hill Inlet", desc: "Beach landing at low water, lookout walk, snorkel at Blue Pearl." },
      { label: "Day 03", title: "Manta Ray Bay → Airlie", desc: "Morning snorkel, downwind run home under full sail." },
    ],
    includes: ["Skipper & crew", "All meals aboard", "Snorkel gear & stinger suits", "Paddleboards", "Cabin with ensuite"],
    departures: ["15 Oct 2026", "29 Oct 2026", "12 Nov 2026"],
    operatorNote:
      "Saltline runs moorings-only anchoring inside the national park and has never dropped an anchor on coral in eight seasons.",
    impactSplit: { protect: 35, restore: 45, uplift: 20 },
    fundsPartner: "Tangaroa Blue",
  },
  {
    slug: "harbour-nights",
    name: "Harbour Nights",
    category: "Sail & Yacht",
    region: "Sydney Harbour",
    rating: 4.8,
    reviews: 267,
    operator: "Harbourline Yachts",
    duration: "1 day",
    detail: "5 hours aboard",
    impact: "Replants harbour seagrass meadows with Operation Posidonia",
    quote: "Client night under the Bridge at golden hour. Not one phone came out all evening.",
    quoteBy: "Marcus L., Sydney",
    price: 395,
    eco: true,
    img: "/australia-yacht.jpg",
    summary:
      "Five hours on the harbour from late afternoon into dark, out through the heads if the swell allows, back under the Bridge as the city comes on. A working yacht with a chef aboard, not a party boat.",
    highlights: [
      "Boards at Rushcutters Bay, 4pm, golden hour on the water",
      "Chef aboard; menu set the week before with you",
      "Twelve guests maximum, whole-boat charter available",
      "Seagrass restoration briefing from the skipper, if you want it",
    ],
    itinerary: [
      { label: "16:00", title: "Rushcutters Bay", desc: "Board, sail out past Shark Island on the afternoon breeze." },
      { label: "17:30", title: "The heads", desc: "Out to the gap if the swell is kind, canapés on deck." },
      { label: "19:00", title: "Under the Bridge", desc: "Dinner at anchor in Lavender Bay as the lights come up." },
      { label: "21:00", title: "Alongside", desc: "Back at Rushcutters Bay by nine." },
    ],
    includes: ["Five hours aboard", "Chef-prepared dinner", "Australian wine list", "Skipper & deckhand", "Wet-weather gear"],
    departures: ["Daily · Oct 2026", "Daily · Nov 2026", "Daily · Dec 2026"],
    operatorNote:
      "Harbourline runs an all-electric tender and offsets every charter's fuel through Operation Posidonia's seagrass plantings.",
    impactSplit: { protect: 30, restore: 50, uplift: 20 },
    fundsPartner: "Operation Posidonia",
  },
  {
    slug: "whale-shark-interception",
    name: "Whale Shark Interception",
    category: "Wildlife",
    region: "Ningaloo",
    rating: 4.9,
    reviews: 188,
    operator: "Ningaloo Drift",
    duration: "5 days",
    detail: "10 swims",
    impact: "Funds ECOCEAN's whale-shark photo-ID library",
    quote: "Three sharks in one morning. The spotter plane radioed in before we'd finished breakfast.",
    quoteBy: "Ellie R., Auckland",
    price: 2450,
    eco: true,
    /* The sheet crops its hero to 16:8, which a portrait top-down aerial cannot
       survive — this frame reads as reef at any crop. */
    img: "/reef-conservation1.jpg",
    summary:
      "Five days on the Ningaloo coast with a spotter plane overhead and a boat that repositions to whatever the pilot finds. Ten in-water swims across the week, plus the fringing reef fifty metres off the beach for everything in between.",
    highlights: [
      "Spotter plane on station every morning of the trip",
      "Ten swims, the operator rebooks you free if the count falls short",
      "Manta cleaning stations most afternoons",
      "Every ID photo goes to the ECOCEAN library under your name",
    ],
    itinerary: [
      { label: "Day 01", title: "Exmouth", desc: "Briefing, fit-out, and an afternoon drift on the fringing reef." },
      { label: "Day 02–04", title: "The interception", desc: "Plane up at dawn; the boat runs to whatever it finds. Two to three swims a day." },
      { label: "Day 05", title: "Manta morning", desc: "Cleaning stations at Coral Bay, then back to Exmouth by four." },
    ],
    includes: ["All ten swims", "Spotter aircraft", "Wetsuit, mask & fins", "All meals and transfers", "Photo library upload"],
    departures: ["05 Oct 2026", "19 Oct 2026", "16 Nov 2026"],
    operatorNote:
      "Ningaloo Drift caps its own season at 40 trips to keep pressure off the aggregation, well below its licensed allowance.",
    impactSplit: { protect: 60, restore: 15, uplift: 25 },
    fundsPartner: "ECOCEAN's whale-shark photo-ID library",
  },
  {
    slug: "neptune-cage-week",
    name: "Neptune Cage Week",
    category: "Expedition",
    region: "South Australia",
    rating: 5,
    reviews: 89,
    operator: "Southern Water Co.",
    duration: "4 days",
    detail: "9 cage drops",
    impact: "Funds white-shark tagging & research at the Neptunes",
    quote: "A 4.5-metre white circled the bottom cage for an hour. I've never been so still.",
    quoteBy: "Dan H., Adelaide",
    price: 3240,
    eco: true,
    scarcity: "Only 3 left",
    img: "/gold-coast-3.jpg",
    summary:
      "Four days at the Neptune Islands in the only water in Australia where you can meet a white shark. Surface cage and ocean-floor cage, nine drops across the week, and a researcher aboard tagging as you watch.",
    highlights: [
      "Both cages, surface and the 20-metre ocean floor cage",
      "Tagging work runs alongside every drop",
      "No chumming: the sharks come to the sea-lion colony, not to bait",
      "Twelve guests, two dive supervisors, one researcher",
    ],
    itinerary: [
      { label: "Day 01", title: "Port Lincoln → North Neptune", desc: "Overnight steam, briefing and cage checks on the way." },
      { label: "Day 02–03", title: "Nine drops", desc: "Surface cage through the morning, floor cage on the slack tide." },
      { label: "Day 04", title: "Sea-lion colony → Port Lincoln", desc: "Snorkel with the colony, then the run home." },
    ],
    includes: ["All nine cage drops", "Dry suits & hookah gear", "All meals aboard", "Twin cabin", "Port Lincoln transfers"],
    departures: ["03 Nov 2026", "17 Nov 2026", "01 Dec 2026"],
    operatorNote:
      "Southern Water Co. carries a research observer on every departure and publishes its tagging data to the national white-shark database.",
    impactSplit: { protect: 65, restore: 10, uplift: 25 },
    fundsPartner: "white-shark tagging at the Neptunes",
  },
];

export const steps = [
  {
    n: "01",
    title: "Ask once",
    desc: "Tell Kai who's coming and when. One conversation covers every vetted operator on the coast.",
    iconD: "M4 5h16v11H8l-4 4z",
  },
  {
    n: "02",
    title: "Pay the operator's rate",
    desc: "Same price as booking direct, always. Our commission comes from the operator's side, never yours.",
    iconD: "M20 12l-8 8-9-9V4h7zM7 7a1 1 0 1 0 0.01 0",
  },
  {
    n: "03",
    title: "5% works for the ocean",
    desc: "A fixed share of every fare funds verified impact in the exact waters you visit, tracked per booking.",
    iconD: "M3 9c2-3 4-3 6 0s4 3 6 0 4-3 6 0M3 15c2-3 4-3 6 0s4 3 6 0 4-3 6 0",
  },
];

export const partners = [
  "Coral Sea Lines",
  "Hervey Bay Whale Co.",
  "Saltline Sailing Co.",
  "Harbourline Yachts",
  "Ningaloo Drift",
  "Southern Water Co.",
  "Reef Restoration Foundation",
  "Tangaroa Blue",
  "Operation Posidonia",
  "ECOCEAN",
];

export const discoverHero = "/whitsundays-1.jpg";

export const whenOptions = ["Oct 2026", "Nov 2026", "Dec 2026", "Jan 2027", "Flexible"];
export const guestOptions = ["1 guest", "2 guests", "3 guests", "4 guests", "5+ guests"];
