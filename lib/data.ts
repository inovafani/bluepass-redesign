/**
 * Content lifted verbatim from `Bluepass Website Redesign.dc.html` —
 * the `renderVals()` block of the design's DCLogic component.
 */

export type WhyCard = { iconD: string; title: string; desc: string };

export const whyCards: WhyCard[] = [
  {
    iconD: "M20 12l-8 8-9-9V4h7zM7 7a1 1 0 1 0 0.01 0",
    title: "Never a markup",
    desc: "You never pay more than booking the operator direct. Our fee funds the reef, it isn't a markup on you.",
  },
  {
    iconD: "M3 9c2-3 4-3 6 0s4 3 6 0 4-3 6 0M3 15c2-3 4-3 6 0s4 3 6 0 4-3 6 0",
    title: "5% gives back",
    desc: "A fixed 5% of every fare protects reefs, funds ocean clean-ups, and lifts coastal communities. Most booking platforms route nothing at all.",
  },
  {
    iconD: "M12 3v4M9 6h6M12 7v13M7 14a5 5 0 0 0 10 0M4 14h3M17 14h3",
    title: "Fairer for operators",
    desc: "Operators keep 100% of their rate. Conservation and partners are paid from our fee, never their margin.",
  },
];

export type Boat = {
  loc: string;
  img: string;
  imgSrc: string;
  name: string;
  guests: string;
  /* Optional because two of these operators publish no rate card. An absent
     price renders as "Price on request" — the alternative is inventing a number
     for a real business on a page that looks like a booking. */
  price?: string;
  unit?: string;
  sub: string;
};

/**
 * The five boats on the Explore grid — Australian operators.
 *
 * Capacities and rates are transcribed from each operator's own public listing,
 * not estimated. Sources, checked 6 Aug 2026:
 *   Alani     yotspace.com/luxury-charter-yacht/alani
 *   Yolo      gcboatcharters.com.au/yolo
 *   Serrano   floatspace.com/boat/serrano
 *   Yot Club  yotclub.com.au/about        (capacity only — no public rate)
 *   Sailing in Paradise  sailinginparadise.com.au/our-boats  (capacity only)
 *
 * These are live third-party prices and they move; re-check before treating the
 * grid as bookable rather than illustrative.
 */
export const boats: Boat[] = [
  {
    loc: "HAMILTON ISLAND",
    img: "boat-1",
    imgSrc: "/yachts/alani/card.webp",
    name: "Alani",
    guests: "Up to 35 guests",
    price: "A$3,600",
    unit: "/ sunset · 2 hours",
    sub: "or A$10,800 / full day · 6 hours",
  },
  {
    loc: "GOLD COAST",
    img: "boat-2",
    imgSrc: "/yachts/yolo/card.webp",
    name: "Yolo",
    guests: "Up to 36 guests",
    price: "A$700",
    unit: "/ hour",
    sub: "13.5m catamaran · whole boat",
  },
  {
    loc: "GOLD COAST",
    img: "boat-3",
    imgSrc: "/yachts/yot-club/card.webp",
    name: "Yot Club",
    guests: "Up to 400 guests",
    sub: "Superyacht venue · Gold Coast & Brisbane",
  },
  {
    loc: "GOLD COAST",
    img: "boat-4",
    imgSrc: "/yachts/sailing-in-paradise/card.webp",
    name: "Sailing in Paradise",
    guests: "Up to 42 guests",
    sub: "Sailing catamaran · Marina Mirage",
  },
  {
    loc: "GOLD COAST",
    img: "boat-5",
    imgSrc: "/yachts/serrano/card.webp",
    name: "Serrano",
    guests: "Up to 20 guests",
    price: "A$420",
    unit: "/ hour",
    sub: "Sailing catamaran · whole boat",
  },
];

export type Way = { iconD: string; title: string; tag: string; desc: string };

export const threeWays: Way[] = [
  {
    iconD: "M12 3l7 3v6c0 5-3 8-7 9-4-1-7-4-7-9V6z",
    title: "Protect",
    tag: "Reef & marine conservation",
    desc: "Misool · Manta Trust · Coral Triangle Center",
  },
  {
    iconD: "M4 12a8 8 0 0 1 14-5M20 4v4h-4M20 12a8 8 0 0 1-14 5M4 20v-4h4",
    title: "Restore",
    tag: "Ocean & beach clean-ups",
    desc: "Ghost-gear & plastic removal, mangroves",
  },
  {
    iconD:
      "M8 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM16 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 20c.5-3.5 3-5.5 6-5.5s5.5 2 6 5.5M12 20c.4-3 2.6-5 5-5s4.6 2 5 5",
    title: "Uplift",
    tag: "Coastal communities",
    desc: "Local jobs, training & socio impact",
  },
];

export type Reel = {
  img: string;
  imgSrc: string;
  /**
   * Instagram's own `/embed/` page for this reel — a real, playable, ToS-compliant player (not the
   * raw .mp4 URL: Instagram stopped exposing that to logged-out requests, which is why
   * `/api/instagram/reel-video` 404s on every reel below despite the thumbnail proxy working fine).
   * Opened in an iframe on click rather than scraped.
   */
  embedUrl: string;
  handle: string;
  name: string;
  caption: string;
  num: string;
};

const igReelThumbSrc = (shortcode: string) =>
  "/api/instagram/reel-thumbnail?url=" + encodeURIComponent(`https://www.instagram.com/reel/${shortcode}/`);
const igReelEmbedUrl = (shortcode: string) => `https://www.instagram.com/reel/${shortcode}/embed/`;

/**
 * Each creator's own highest-viewed reel at the time of writing (2026-08-20), hotlinked through
 * `/api/instagram/reel-thumbnail` rather than stored — see the matching note in `lib/partners.ts`,
 * whose `creators[].img` deliberately reuses the same shortcode per person.
 */
export const reels: Reel[] = [
  {
    img: "reel-1",
    imgSrc: igReelThumbSrc("DZxAUoWzRmI"),
    embedUrl: igReelEmbedUrl("DZxAUoWzRmI"),
    handle: "@josiahwg",
    name: "Josiah William Gordon",
    caption: "A cenote dive, shot for his book 'Xibalba'",
    num: "01",
  },
  {
    img: "reel-2",
    imgSrc: igReelThumbSrc("DBvwGTlPQsA"),
    embedUrl: igReelEmbedUrl("DBvwGTlPQsA"),
    handle: "@camvaughne",
    name: "Cam Vaughne",
    caption: "A hidden paradise in Banda Neira, Indonesia",
    num: "02",
  },
  {
    img: "reel-3",
    imgSrc: igReelThumbSrc("CjfrbyWDFJY"),
    embedUrl: igReelEmbedUrl("CjfrbyWDFJY"),
    handle: "@storyofsage",
    name: "Story of Sage",
    caption: "Diving the Blue Holes of Palau",
    num: "03",
  },
];

/**
 * `href: "#"` marks a link with nowhere real to go yet (no page built, or - "Indonesia" - no AU
 * scope for it right now). Left as `#` deliberately rather than removed outright per the 2026-08-20
 * decision on the ones still under discussion (Gift cards, Pricing, Support); "Indonesia",
 * "Become an operator" and "List your boat" were dropped entirely the same day, and "Affiliates"
 * was folded into "Creator program" rather than kept as a second link to the same place.
 */
export const footerColumns: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Trips",
    links: [
      { label: "Australia", href: "/" },
      { label: "All trips", href: "/" },
      { label: "Gift cards", href: "#" },
    ],
  },
  {
    title: "Conservation",
    links: [
      { label: "Where it goes", href: "/conservation#where-it-goes" },
      { label: "Partners we fund", href: "/conservation#partners" },
      { label: "Impact report", href: "/conservation#impact-report" },
    ],
  },
  {
    title: "Partners",
    links: [{ label: "Creator program", href: "/partners/apply" }],
  },
  {
    title: "For operators",
    links: [
      { label: "Pricing", href: "#" },
      { label: "Support", href: "#" },
    ],
  },
];

/* Trips is the landing page and sits at "/" itself — the label carries the name so the URL
   doesn't have to (still internally called "Discover" in file/component names - only the visible
   label changed). Charters sits last on its own /explore route: it opens on the boat grid rather
   than a hero now, so it reads as a destination alongside the others instead of the landing page
   they all hang off.
   Renamed from "Discover"/"Explore" 2026-08-21 (Tony's UX audit, §1): the two read as unrelated
   products under those labels - Trips is per-guest multi-day trips, Charters is whole-boat by the
   hour. Same nav item, same href, only the label changed - no redirects needed. */
export const navLinks: { label: string; href: string }[] = [
  { label: "Trips", href: "/" },
  { label: "Conservation", href: "/conservation" },
  { label: "Partners", href: "/partners" },
  { label: "Charters", href: "/explore" },
];

/* Full-bleed section photography, served from /public. */
export const heroImage = "/australia-yacht.jpg";
export const whyImage = "/sidney.jpg";
export const conservationImage = "/great-barrier.jpg";
export const ctaImage = "/gold-coast-3.jpg";
