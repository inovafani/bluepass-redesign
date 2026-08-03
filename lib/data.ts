/**
 * Content lifted verbatim from `Bluepass Website Redesign.dc.html` —
 * the `renderVals()` block of the design's DCLogic component.
 */

export type WhyCard = { iconD: string; title: string; desc: string };

export const whyCards: WhyCard[] = [
  {
    iconD: "M20 12l-8 8-9-9V4h7zM7 7a1 1 0 1 0 0.01 0",
    title: "Never a markup",
    desc: "You never pay more than booking the operator direct. Our fee funds the reef — it isn't a markup on you.",
  },
  {
    iconD: "M3 9c2-3 4-3 6 0s4 3 6 0 4-3 6 0M3 15c2-3 4-3 6 0s4 3 6 0 4-3 6 0",
    title: "5% gives back",
    desc: "A fixed 5% of every fare protects reefs, funds ocean clean-ups, and lifts coastal communities. Most booking platforms route nothing at all.",
  },
  {
    iconD: "M12 3v4M9 6h6M12 7v13M7 14a5 5 0 0 0 10 0M4 14h3M17 14h3",
    title: "Fairer for operators",
    desc: "Operators keep 100% of their rate. Conservation and partners are paid from our fee — never their margin.",
  },
];

export type Boat = {
  loc: string;
  img: string;
  imgSrc: string;
  name: string;
  guests: string;
  price: string;
  unit: string;
  sub: string;
};

export const boats: Boat[] = [
  {
    loc: "KOMODO",
    img: "boat-1",
    imgSrc: "https://picsum.photos/seed/bluepass-boat-1/800/1000",
    name: "Alexa",
    guests: "Up to 2 guests",
    price: "$6,499",
    unit: "/ night",
    sub: "Couples-only · 1 cabin yacht",
  },
  {
    loc: "RAJA AMPAT",
    img: "boat-2",
    imgSrc: "https://picsum.photos/seed/bluepass-boat-2/800/1000",
    name: "Allikai",
    guests: "Up to 15 guests",
    price: "$690",
    unit: "/ cabin · night",
    sub: "or charter $9,650 / night · whole yacht",
  },
  {
    loc: "KOMODO",
    img: "boat-3",
    imgSrc: "https://picsum.photos/seed/bluepass-boat-3/800/1000",
    name: "Alila Purnama",
    guests: "Up to 10 guests",
    price: "$3,000",
    unit: "/ cabin · night",
    sub: "or charter $15,000 / night · whole yacht",
  },
  {
    loc: "RAJA AMPAT",
    img: "boat-4",
    imgSrc: "https://picsum.photos/seed/bluepass-boat-4/800/1000",
    name: "Amandira",
    guests: "Up to 10 guests",
    price: "$3,180",
    unit: "/ cabin · night",
    sub: "or charter $15,900 / night · whole yacht",
  },
  {
    loc: "KOMODO",
    img: "boat-5",
    imgSrc: "https://picsum.photos/seed/bluepass-boat-5/800/1000",
    name: "Anne Bonny",
    guests: "Up to 8 guests",
    price: "$1,483",
    unit: "/ night",
    sub: "or charter $4,450 / night · whole yacht",
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
  handle: string;
  name: string;
  caption: string;
  num: string;
};

export const reels: Reel[] = [
  {
    img: "reel-1",
    imgSrc: "https://picsum.photos/seed/bluepass-reel-1/700/1000",
    handle: "@joseewq",
    name: "Josiah William Gordon",
    caption: "Cinematic coastlines through a fine-art lens",
    num: "02",
  },
  {
    img: "reel-2",
    imgSrc: "https://picsum.photos/seed/bluepass-reel-2/700/1000",
    handle: "@camvaughne",
    name: "Cam Vaughne",
    caption: "Remote Indonesia by sail, film, and sea",
    num: "03",
  },
  {
    img: "reel-3",
    imgSrc: "https://picsum.photos/seed/bluepass-reel-3/700/1000",
    handle: "@camvaughne",
    name: "Cam Vaughne",
    caption: "Remote Indonesia by sail, film, and sea",
    num: "04",
  },
  {
    img: "reel-4",
    imgSrc: "https://picsum.photos/seed/bluepass-reel-4/700/1000",
    handle: "@joseewq",
    name: "Josiah William Gordon",
    caption: "Sailing the Flores Sea at golden hour",
    num: "05",
  },
];

export const footerColumns = [
  { title: "Discover", links: ["Indonesia", "Australia", "All trips", "Gift cards"] },
  { title: "Conservation", links: ["Where it goes", "Partners we fund", "Impact report"] },
  { title: "Partners", links: ["Become an operator", "Creator program", "Affiliates"] },
  { title: "For operators", links: ["List your boat", "Pricing", "Support"] },
];

export const navLinks = [
  "Home",
  "Discover",
  "Indonesia",
  "Australia",
  "Conservation",
  "Partners",
];

export const heroImage = "https://picsum.photos/seed/bluepass-hero/1600/900";
export const reefImage = "https://picsum.photos/seed/bluepass-reef/1600/900";
export const volcanoImage = "https://picsum.photos/seed/bluepass-volcano/1600/900";
export const sunsetImage = "https://picsum.photos/seed/bluepass-sunset/1600/900";
