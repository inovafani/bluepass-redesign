/**
 * Partners page content. Photography is picsum placeholder — swap the `img`
 * fields for real assets.
 *
 * Tone note: like the conservation page, nothing here claims results that do
 * not exist yet. "Founding cohort" framing is forward-looking on purpose.
 */

export const heroImage = "https://picsum.photos/seed/bp-partners-hero/1800/1100";

export const stats = [
  { value: "5%", label: "Founding partner commission" },
  { value: "No", label: "Client markup, ever" },
  { value: "1", label: "Indonesia operator catalogue" },
];

/** The three-beat story, with each beat's payoff folded in. */
export const beats = [
  {
    n: "01",
    title: "A client asks where to dive.",
    sub: "You send one Bluepass link.",
    tag: "Earn",
    tagNote: "No markup to your client",
    iconD: "M4 5h16v11H8l-4 4z",
  },
  {
    n: "02",
    title: "They see vetted Indonesia operators.",
    sub: "No markup. No messy handoff.",
    tag: "Trust",
    tagNote: "Vetted operators only",
    iconD: "M12 3l7 3v6c0 5-3 8-7 9-4-1-7-4-7-9V6zM9 12l2 2 4-4",
  },
  {
    n: "03",
    title: "The booking funds the reef.",
    sub: "You earn. They get proof.",
    tag: "Differentiate",
    tagNote: "5% to the reef, every trip",
    iconD: "M3 15c2-3 4-3 6 0s4 3 6 0 4-3 6 0M3 9c2-3 4-3 6 0s4 3 6 0 4-3 6 0",
  },
];

export const movePills = ["Clean booking path", "Tracked attribution", "Reef proof"];

export const moves = [
  {
    n: "01",
    kicker: "Claim",
    title: "Claim your link",
    desc: "Founding-partner terms locked, operator catalogue included, and zero setup.",
    iconD: "M9 15l6-6M8.5 12.5l-2 2a3.5 3.5 0 0 0 5 5l2-2M15.5 11.5l2-2a3.5 3.5 0 0 0-5-5l-2 2",
  },
  {
    n: "02",
    kicker: "Share",
    title: "Book or refer",
    desc: "Send clients through your tracked link, or book on their behalf with group-booking help.",
    iconD: "M6 3h9l4 4v14H6zM15 3v4h4M9 12h6M9 16h4",
  },
  {
    n: "03",
    kicker: "Book",
    title: "Client pays the operator's rate",
    desc: "No markup, ever. The displayed price is the operator's own rate.",
    iconD: "M20 12l-8 8-9-9V4h7zM7 7a1 1 0 1 0 .01 0",
  },
  {
    n: "04",
    kicker: "Prove",
    title: "You earn — the reef wins",
    desc: "You receive referral commission, and every booking funds reef work you can show clients.",
    iconD: "M12 3l2.5 5.5L20 11l-5.5 2.5L12 19l-2.5-5.5L4 11l5.5-2.5z",
  },
];

export const operatorRegions = [
  "Raja Ampat",
  "Komodo",
  "Lembeh",
  "Bali",
  "Wakatobi",
  "Bunaken",
  "Mentawai",
];

export const audiences = [
  "Dive shops",
  "Travel agencies",
  "Trip leaders",
  "Dive instructors",
  "Advisors",
  "Ocean partners",
];

export const toolkit = [
  {
    title: "Operator catalogue",
    note: "Vetted trips",
    iconD: "M4 5h16v14H4zM4 9h16M9 9v10",
  },
  {
    title: "Tracked link + dashboard",
    note: "Attribution",
    iconD: "M4 18l5-6 4 4 7-9M4 18h16",
  },
  {
    title: "Co-brandable impact assets",
    note: "Reef proof",
    iconD: "M4 6h16v11H4zM4 10h16M8 21h8",
  },
  {
    title: "One human contact",
    note: "Human backup",
    iconD: "M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM4 20c1-4 4.3-6 8-6s7 2 8 6",
  },
];

export type Creator = {
  slug: string;
  name: string;
  handle: string;
  region: string;
  desc: string;
  img: string;
};

export const creators: Creator[] = [
  {
    slug: "josiah-william-gordon",
    name: "Josiah William Gordon",
    handle: "@josiahwg",
    region: "Indonesia / New Zealand",
    desc: "Fine-art travel photographer with a cinematic, destination-led eye.",
    img: "https://picsum.photos/seed/bp-creator-josiah/900/1200",
  },
  {
    slug: "cam-vaughne",
    name: "Cam Vaughne",
    handle: "@camvaughne",
    region: "Bali, Indonesia",
    desc: "Photo and film partner documenting remote Indonesia, sailing, and ocean conservation.",
    img: "https://picsum.photos/seed/bp-creator-cam/900/1200",
  },
  {
    slug: "story-of-sage",
    name: "Story of Sage",
    handle: "@storyofsage",
    region: "Indonesia",
    desc: "Ocean and travel storyteller with a soft, cinematic lens on slow island life.",
    img: "https://picsum.photos/seed/bp-creator-sage/900/1200",
  },
];
