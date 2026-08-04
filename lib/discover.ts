/**
 * Discover page content. Photography is served from /public — the layout is
 * sized for 4:5 (trips) and 4:3 (regions), so `img` fields are cropped to fit.
 *
 * Ningaloo and South Australia have no location photography yet; both fall back
 * to the nearest reef / open-coast frame we hold.
 */

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

export type Trip = {
  slug: string;
  name: string;
  category: Category;
  region: string;
  rating: number;
  reviews: number;
  operator: string;
  duration: string;
  detail: string;
  impact: string;
  quote: string;
  price: number;
  eco: boolean;
  scarcity?: string;
  img: string;
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
    price: 2190,
    eco: true,
    img: "/great-barrier-5.jpg",
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
    price: 890,
    eco: true,
    img: "/hervey-bay-1.jpg",
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
    price: 1150,
    eco: true,
    img: "/whitsundays-3.jpg",
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
    price: 395,
    eco: true,
    img: "/australia-yacht.jpg",
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
    price: 2450,
    eco: true,
    img: "/great-barrier-4.jpg",
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
    price: 3240,
    eco: true,
    scarcity: "Only 3 left",
    img: "/gold-coast-3.jpg",
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
    desc: "Same price as booking direct — always. Our commission comes from the operator's side, never yours.",
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
