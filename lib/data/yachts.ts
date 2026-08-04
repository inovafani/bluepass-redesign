/**
 * â”€â”€â”€ YACHT DATA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 *
 * Single source of truth for all 36 yacht/operator profiles.
 * Used by: explore-indonesia grid Â· for-operators fleet browser Â· yachts/[slug] detail pages.
 *
 * HOW TO UPDATE IMAGES
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * Find the yacht by name, then edit its `images` block:
 *
 *   card    â†’ thumbnail shown on grid cards
 *   hero    â†’ full-bleed background on the detail page
 *   gallery â†’ up to 5 photos in the detail page gallery
 *             (first image is displayed large/tall on the left)
 *
 * Swap any URL. To use a local file put it in /public/yachts/<slug>/
 * and reference it as "/yachts/<slug>/hero.jpg".
 */

export type YachtImages = {
  /** Grid card thumbnail */
  card: string;
  /** Full-bleed hero on detail page */
  hero: string;
  /** Gallery photos – first image is displayed large */
  gallery: { src: string; alt: string }[];
};

export type Departure = { dates: string; duration: string; berths: string };
export type ItineraryDay = { day: number; title: string; description: string };

export type Yacht = {
  slug: string;
  name: string;
  /** Used in "+ Plan with [firstName]" CTA */
  firstName: string;
  /** Uppercase label on cards: "KOMODO" | "RAJA AMPAT" */
  locationBadge: string;
  /** Filter value: "Komodo" | "Raja Ampat" */
  region: "Komodo" | "Raja Ampat";
  /** Tier badge on cards: "Explorer" | "Premium" | "Legend" | "" */
  tier: string;
  /** Whether cabin-by-cabin booking is available (vs whole-yacht only) */
  cabinBookable: boolean;
  maxGuests: number;
  length: string;
  cabins: number;
  build: string;
  pricePerCabin: string;
  charterPrice: string | null;
  charterOnly: boolean;
  tagline: string | null;
  about: string;
  departures: Departure[];
  itinerary: ItineraryDay[];
  conservation: string;
  images: YachtImages;
};

// â”€â”€â”€ Shared itinerary templates (Komodo / Raja Ampat 7-day) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const KOMODO_7: ItineraryDay[] = [
  { day: 1, title: "Labuan Bajo embarkation", description: "Board mid-afternoon. Welcome briefing, check-in dive at Sebayur." },
  { day: 2, title: "Sangeang Volcano", description: "Dives at Hot Rocks (black sand, ribbon eels). Cruise south overnight." },
  { day: 3, title: "Castle Rock & Crystal Rock", description: "Drift dives, schooling jacks, white-tips. Manta Alley in the afternoon." },
  { day: 4, title: "Komodo Dragon walk", description: "Morning hike on Rinca. Afternoon dive at Karang Makassar (manta cleaning)." },
  { day: 5, title: "Batu Bolong & Pink Beach", description: "Iconic vertical wall. Beach BBQ. Sunset dive if conditions allow." },
  { day: 6, title: "Southern Komodo", description: "Three dives – Cannibal Rock, Yellow Wall of Texas. Macro-rich, slower current." },
  { day: 7, title: "Wainilu & disembark", description: "One final morning dive. Cruise back to Labuan Bajo, disembark after lunch." },
];

const RAJA_AMPAT_7: ItineraryDay[] = [
  { day: 1, title: "Sorong embarkation", description: "Board in Sorong. Evening passage toward the Dampier Strait." },
  { day: 2, title: "Cape Kri", description: "World fish-count record site. Three dives, schooling barracuda and fusiliers." },
  { day: 3, title: "Arborek & Manta Sandy", description: "Village snorkel in the morning. Manta cleaning station in the afternoon." },
  { day: 4, title: "Blue Magic seamount", description: "Current dive with wobbegong sharks and walking fish." },
  { day: 5, title: "Misool karst", description: "Cave and arch systems, pygmy seahorse, mushroom corals." },
  { day: 6, title: "Wayag", description: "Sunrise hike to the viewpoint. Kayaking through the karst lagoon." },
  { day: 7, title: "Return to Sorong", description: "Morning dive, farewell breakfast, disembark in Sorong." },
];

const KOMODO_CONSERVATION = "Routes 5% of every BluePass booking to BluePass Conservation partners: Coral Triangle Center (reef restoration), Mangrove Action Project (coastal nurseries), and The Manta Trust (research + protection in Komodo).";
const RAJA_CONSERVATION = "Routes 5% of every BluePass booking to the Raja Ampat Blue Water Trust (community reef patrols and coral nursery support) and Coral Triangle Center.";

// â”€â”€â”€ Local image helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//
// Images live in  /public/yachts/<slug>/  using these filenames:
//
//   card.jpg        grid card thumbnail  (â‰ˆ 800 Ã— 600)
//   hero.jpg        detail page hero     (â‰ˆ 2200 Ã— 1200)
//   gallery-1.jpg   large gallery image  (â‰ˆ 1200 Ã— 900)  â† shown big on left
//   gallery-2.jpg   small gallery image  (â‰ˆ 800 Ã— 600)
//   gallery-3.jpg   small gallery image  (â‰ˆ 800 Ã— 600)
//   gallery-4.jpg   small gallery image  (â‰ˆ 800 Ã— 600)
//   gallery-5.jpg   small gallery image  (â‰ˆ 800 Ã— 600)
//
// Drop the files in and refresh – no code changes needed.
//
// Optional: pass an alts[] array as the second argument to set alt text.
//   images: localImages("anne-bonny", ["Sailing in Komodo", "Interior cabin", ...])

function localImages(slug: string, alts: string[] = []): YachtImages {
  return {
    card: `/yachts/${slug}/card.jpg`,
    hero: `/yachts/${slug}/hero.jpg`,
    gallery: [1, 2, 3, 4, 5].map((n) => ({
      src: `/yachts/${slug}/gallery-${n}.jpg`,
      alt: alts[n - 1] ?? "",
    })),
  };
}

// â”€â”€â”€ All 36 yachts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const yachts: Yacht[] = [

  // â”€â”€â”€ 01 Â· ALEXA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    slug: "alexa", name: "Alexa", firstName: "Alexa",
    locationBadge: "KOMODO", region: "Komodo",
    tier: "", cabinBookable: false,
    maxGuests: 2, length: "22 m", cabins: 1, build: "Custom fusion yacht",
    pricePerCabin: "$6,499", charterPrice: null, charterOnly: true,
    tagline: "Couples-only fusion yacht",
    about: "Alexa is a couples-only private yacht built for two – one master suite, a private dive tender, and a chef who works to the couple's menu before departure. No shared decks, no group schedules. Routes cover Komodo's quieter sites away from the main traffic.",
    departures: [
      { dates: "Jul 7 – Jul 14", duration: "7 nights", berths: "2 berths" },
      { dates: "Aug 4 – Aug 11", duration: "7 nights", berths: "2 berths" },
      { dates: "Sep 8 – Sep 15", duration: "7 nights", berths: "2 berths" },
    ],
    itinerary: KOMODO_7,
    conservation: `Alexa ${KOMODO_CONSERVATION}`,
images: {
      card: "/yachts/alexa/card.webp",
      hero: "/yachts/alexa/hero.webp",
      gallery: [
        { src: "/yachts/alexa/gallery-1.webp", alt: "Alexa deck" },
        { src: "/yachts/alexa/gallery-2.webp", alt: "Alexa exterior" },
        { src: "/yachts/alexa/gallery-3.webp", alt: "Interior" },
        { src: "/yachts/alexa/gallery-4.webp", alt: "On deck" },
        { src: "/yachts/alexa/gallery-5.webp", alt: "Alexa at anchor" },
      ],
    },
  },

  // â”€â”€â”€ 02 Â· ALIIKAI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    slug: "aliikai", name: "Aliikai", firstName: "Aliikai",
    locationBadge: "RAJA AMPAT", region: "Raja Ampat",
    tier: "Premium", cabinBookable: true,
    maxGuests: 15, length: "35 m", cabins: 7, build: "Indonesian phinisi",
    pricePerCabin: "$690", charterPrice: "$8,900", charterOnly: false,
    tagline: null,
    about: "Aliikai is a 35-metre Raja Ampat phinisi with seven cabins and a reputation for some of the best dive guiding in West Papua. Running year-round routes across Misool, Dampier Strait, and the Wayag islands.",
    departures: [
      { dates: "Jul 5 – Jul 12", duration: "7 nights", berths: "15 berths" },
      { dates: "Aug 2 – Aug 9", duration: "7 nights", berths: "15 berths" },
      { dates: "Sep 6 – Sep 13", duration: "7 nights", berths: "15 berths" },
    ],
    itinerary: RAJA_AMPAT_7,
    conservation: `Aliikai ${RAJA_CONSERVATION}`,
images: {
      card: "/yachts/aliikai/card.webp",
      hero: "/yachts/aliikai/hero.webp",
      gallery: [
        { src: "/yachts/aliikai/gallery-1.webp", alt: "Aliikai at sea" },
        { src: "/yachts/aliikai/gallery-2.webp", alt: "Aliikai deck" },
        { src: "/yachts/aliikai/gallery-3.webp", alt: "Aliikai exterior" },
        { src: "/yachts/aliikai/gallery-4.webp", alt: "On deck" },
        { src: "/yachts/aliikai/gallery-5.webp", alt: "View" },
      ],
    },
  },

  // â”€â”€â”€ 03 Â· ALILA PURNAMA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    slug: "alila-purnama", name: "Alila Purnama", firstName: "Alila",
    locationBadge: "KOMODO", region: "Komodo",
    tier: "Legend", cabinBookable: false,
    maxGuests: 10, length: "46 m", cabins: 5, build: "Indonesian phinisi",
    pricePerCabin: "$3,000", charterPrice: "$15,000", charterOnly: true,
    tagline: null,
    about: "Alila Purnama is a 46-metre phinisi with five suites, a spa, and a dedicated dive deck. Built from ironwood in South Sulawesi and refitted in 2021. Legend tier – flagship Indonesian phinisi-class yacht with concierge service and multiple decks.",
    departures: [
      { dates: "Sep 5 – Sep 12", duration: "7 nights", berths: "10 berths" },
      { dates: "Oct 3 – Oct 10", duration: "7 nights", berths: "10 berths" },
      { dates: "Oct 31 – Nov 7", duration: "7 nights", berths: "10 berths" },
      { dates: "Nov 28 – Dec 5", duration: "7 nights", berths: "10 berths" },
      { dates: "Dec 26 – Jan 2", duration: "7 nights", berths: "10 berths" },
    ],
    itinerary: KOMODO_7,
    conservation: `Alila Purnama ${KOMODO_CONSERVATION}`,
images: {
      card: "/yachts/alila-purnama/card.webp",
      hero: "/yachts/alila-purnama/hero.webp",
      gallery: [
        { src: "/yachts/alila-purnama/gallery-1.webp", alt: "Alila Purnama exterior" },
        { src: "/yachts/alila-purnama/gallery-2.webp", alt: "Interior starboard lounge" },
        { src: "/yachts/alila-purnama/gallery-3.webp", alt: "Bali suite cabin" },
        { src: "/yachts/alila-purnama/gallery-4.webp", alt: "Cirebon suite cabin" },
        { src: "/yachts/alila-purnama/gallery-5.webp", alt: "Master suite Sriwijaya" },
      ],
    },
  },

  // â”€â”€â”€ 04 Â· AMANDIRA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    slug: "amandira", name: "Amandira", firstName: "Amandira",
    locationBadge: "RAJA AMPAT", region: "Raja Ampat",
    tier: "", cabinBookable: false,
    maxGuests: 10, length: "45 m", cabins: 5, build: "Indonesian phinisi",
    pricePerCabin: "$3,190", charterPrice: "$15,500", charterOnly: false,
    tagline: null,
    about: "Amandira is Aman's private charter phinisi – 45 metres moored permanently in Raja Ampat. Whole-vessel charters for up to ten guests, covering Misool, the Dampier Strait, and private-access zones in the Bird's Head Seascape.",
    departures: [
      { dates: "Jul 19 – Jul 26", duration: "7 nights", berths: "10 berths" },
      { dates: "Aug 16 – Aug 23", duration: "7 nights", berths: "10 berths" },
      { dates: "Sep 20 – Sep 27", duration: "7 nights", berths: "10 berths" },
    ],
    itinerary: RAJA_AMPAT_7,
    conservation: `Amandira ${RAJA_CONSERVATION}`,
images: {
      card: "/yachts/amandira/card.webp",
      hero: "/yachts/amandira/hero.webp",
      gallery: [
        { src: "/yachts/amandira/gallery-1.webp", alt: "Amandira sundeck at sunset" },
        { src: "/yachts/amandira/gallery-2.webp", alt: "View from deck at sundown" },
        { src: "/yachts/amandira/gallery-3.webp", alt: "Bow and crew" },
        { src: "/yachts/amandira/gallery-4.webp", alt: "Amandira exterior" },
        { src: "/yachts/amandira/gallery-5.webp", alt: "Stern lounge at sunset" },
      ],
    },
  },

  // â”€â”€â”€ 05 Â· ANNE BONNY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    slug: "anne-bonny", name: "Anne Bonny", firstName: "Anne",
    locationBadge: "KOMODO", region: "Komodo",
    tier: "Explorer", cabinBookable: false,
    maxGuests: 8, length: "30 m", cabins: 3, build: "Indonesian phinisi",
    pricePerCabin: "$1,483", charterPrice: "$4,450", charterOnly: true,
    tagline: null,
    about: "Anne Bonny is a 30-metre liveaboard yacht with 3 cabins for up to 8 guests. Cruises Komodo waters with seasonal Raja Ampat itineraries. Whole-yacht private charter only. Accessible adventure tier – premium dive operation without flagship pricing.",
    departures: [
      { dates: "Sep 12 – Sep 19", duration: "7 nights", berths: "8 berths" },
      { dates: "Oct 10 – Oct 17", duration: "7 nights", berths: "8 berths" },
      { dates: "Oct 31 – Nov 7", duration: "7 nights", berths: "8 berths" },
      { dates: "Nov 28 – Dec 5", duration: "7 nights", berths: "8 berths" },
      { dates: "Dec 26 – Jan 2", duration: "7 nights", berths: "8 berths" },
    ],
    itinerary: KOMODO_7,
    conservation: `Anne Bonny ${KOMODO_CONSERVATION}`,
images: {
      card: "/yachts/anne-bonny/card.webp",
      hero: "/yachts/anne-bonny/hero.webp",
      gallery: [
        { src: "/yachts/anne-bonny/gallery-1.webp", alt: "Anne Bonny under sail" },
        { src: "/yachts/anne-bonny/gallery-2.webp", alt: "Master cabin" },
        { src: "/yachts/anne-bonny/gallery-3.webp", alt: "Master cabin view" },
        { src: "/yachts/anne-bonny/gallery-4.webp", alt: "Double cabin" },
        { src: "/yachts/anne-bonny/gallery-5.webp", alt: "Double cabins" },
      ],
    },
  },

  // â”€â”€â”€ 06 Â· CALICO JACK â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    slug: "calico-jack", name: "Calico Jack", firstName: "Jack",
    locationBadge: "KOMODO", region: "Komodo",
    tier: "Premium", cabinBookable: true,
    maxGuests: 10, length: "28 m", cabins: 5, build: "Indonesian phinisi",
    pricePerCabin: "$3,200", charterPrice: "$46,000", charterOnly: false,
    tagline: null,
    about: "Calico Jack has operated out of Labuan Bajo since 2015, building a reputation for polished private charters across Komodo National Park. Every trip is run by the founding captain who grew up in the Flores islands.",
    departures: [
      { dates: "Jul 14 – Jul 21", duration: "7 nights", berths: "10 berths" },
      { dates: "Aug 11 – Aug 18", duration: "7 nights", berths: "10 berths" },
      { dates: "Sep 8 – Sep 15", duration: "7 nights", berths: "10 berths" },
    ],
    itinerary: KOMODO_7,
    conservation: `Calico Jack ${KOMODO_CONSERVATION}`,
images: {
      card: "/yachts/calico-jack/card.jpg",
      hero: "/yachts/calico-jack/hero.jpg",
      gallery: [
        { src: "/yachts/calico-jack/gallery-1.jpg", alt: "Calico Jack under sail" },
        { src: "/yachts/calico-jack/gallery-2.webp", alt: "Twin cabin" },
        { src: "/yachts/calico-jack/gallery-3.webp", alt: "Twin cabin view" },
        { src: "/yachts/calico-jack/gallery-4.webp", alt: "Double cabin" },
        { src: "/yachts/calico-jack/gallery-5.webp", alt: "Cabin interior" },
      ],
    },
  },

  // â”€â”€â”€ 07 Â· CARPE DIEM â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    slug: "carpe-diem", name: "Carpe Diem", firstName: "Carpe Diem",
    locationBadge: "RAJA AMPAT", region: "Raja Ampat",
    tier: "Explorer", cabinBookable: false,
    maxGuests: 12, length: "34 m", cabins: 6, build: "Indonesian phinisi",
    pricePerCabin: "$885", charterPrice: "$8,580", charterOnly: false,
    tagline: null,
    about: "Carpe Diem is a mid-range Raja Ampat phinisi with strong photography light conditions, knowledgeable guides, and flexible routing that follows currents rather than a fixed schedule.",
    departures: [
      { dates: "Jul 5 – Jul 12", duration: "7 nights", berths: "12 berths" },
      { dates: "Aug 2 – Aug 9", duration: "7 nights", berths: "12 berths" },
      { dates: "Sep 6 – Sep 13", duration: "7 nights", berths: "12 berths" },
    ],
    itinerary: RAJA_AMPAT_7,
    conservation: `Carpe Diem ${RAJA_CONSERVATION}`,
images: {
      card: "/yachts/carpe-diem/card.jpg",
      hero: "/yachts/carpe-diem/hero.jpg",
      gallery: [
        { src: "/yachts/carpe-diem/gallery-1.jpg", alt: "Carpe Diem at sea" },
        { src: "/yachts/carpe-diem/gallery-2.jpg", alt: "Carpe Diem sailing" },
        { src: "/yachts/carpe-diem/gallery-3.jpg", alt: "Deck view" },
        { src: "/yachts/carpe-diem/gallery-4.jpg", alt: "Komodo passage" },
        { src: "/yachts/carpe-diem/gallery-5.jpg", alt: "Underway" },
      ],
    },
  },

  // â”€â”€â”€ 08 Â· CELESTIA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    slug: "celestia", name: "Celestia", firstName: "Celestia",
    locationBadge: "KOMODO", region: "Komodo",
    tier: "", cabinBookable: false,
    maxGuests: 14, length: "38 m", cabins: 7, build: "Indonesian phinisi",
    pricePerCabin: "$1,643", charterPrice: null, charterOnly: false,
    tagline: null,
    about: "Celestia is a 38-metre phinisi based in Labuan Bajo running 7-night Komodo expeditions for up to 14 guests. Modern air-conditioned saloon and a covered dive deck covering all signature Komodo sites.",
    departures: [
      { dates: "Jul 7 – Jul 14", duration: "7 nights", berths: "14 berths" },
      { dates: "Aug 4 – Aug 11", duration: "7 nights", berths: "14 berths" },
      { dates: "Sep 1 – Sep 8", duration: "7 nights", berths: "14 berths" },
    ],
    itinerary: KOMODO_7,
    conservation: `Celestia ${KOMODO_CONSERVATION}`,
images: {
      card: "/yachts/celestia/card.jpg",
      hero: "/yachts/celestia/hero.jpg",
      gallery: [
        { src: "/yachts/celestia/gallery-1.jpg", alt: "Celestia roof deck" },
        { src: "/yachts/celestia/gallery-2.jpg", alt: "Main deck" },
        { src: "/yachts/celestia/gallery-1.jpg", alt: "Celestia at anchor" },
        { src: "/yachts/celestia/gallery-2.jpg", alt: "Deck overview" },
        { src: "/yachts/celestia/gallery-1.jpg", alt: "Roof deck view" },
      ],
    },
  },

  // â”€â”€â”€ 09 Â· DUNIA BARU â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    slug: "dunia-baru", name: "Dunia Baru", firstName: "Dunia Baru",
    locationBadge: "KOMODO", region: "Komodo",
    tier: "Legend", cabinBookable: false,
    maxGuests: 14, length: "36 m", cabins: 7, build: "Traditional phinisi",
    pricePerCabin: "$2,857", charterPrice: "$20,000", charterOnly: false,
    tagline: null,
    about: "Dunia Baru is a traditionally built phinisi running high-season Komodo circuits. Seven cabins, a spacious upper deck, and a camera wash station for photographers.",
    departures: [
      { dates: "Jul 21 – Jul 28", duration: "7 nights", berths: "14 berths" },
      { dates: "Aug 18 – Aug 25", duration: "7 nights", berths: "14 berths" },
      { dates: "Sep 22 – Sep 29", duration: "7 nights", berths: "14 berths" },
    ],
    itinerary: KOMODO_7,
    conservation: `Dunia Baru ${KOMODO_CONSERVATION}`,
images: {
      card: "/yachts/dunia-baru/card.webp",
      hero: "/yachts/dunia-baru/hero.webp",
      gallery: [
        { src: "/yachts/dunia-baru/gallery-1.webp", alt: "Dunia Baru exterior" },
        { src: "/yachts/dunia-baru/gallery-2.webp", alt: "Dunia Baru under sail" },
        { src: "/yachts/dunia-baru/gallery-3.jpg", alt: "Interior saloon" },
        { src: "/yachts/dunia-baru/gallery-2.webp", alt: "Sailing passage" },
        { src: "/yachts/dunia-baru/gallery-1.webp", alt: "Exterior at anchor" },
      ],
    },
  },

  // â”€â”€â”€ 10 Â· FENIDES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    slug: "fenides", name: "Fenides", firstName: "Fenides",
    locationBadge: "RAJA AMPAT", region: "Raja Ampat",
    tier: "Premium", cabinBookable: true,
    maxGuests: 11, length: "41 m", cabins: 5, build: "Indonesian phinisi",
    pricePerCabin: "$815", charterPrice: "$8,580", charterOnly: false,
    tagline: null,
    about: "Fenides is a compact Raja Ampat phinisi ideal for groups looking for value without sacrificing access. Five cabins, a reliable dive team, and a route calendar that prioritises current conditions.",
    departures: [
      { dates: "Jul 12 – Jul 19", duration: "7 nights", berths: "11 berths" },
      { dates: "Aug 9 – Aug 16", duration: "7 nights", berths: "11 berths" },
      { dates: "Sep 13 – Sep 20", duration: "7 nights", berths: "11 berths" },
    ],
    itinerary: RAJA_AMPAT_7,
    conservation: `Fenides ${RAJA_CONSERVATION}`,
images: {
      card: "/yachts/fenides/card.jpg",
      hero: "/yachts/fenides/hero.jpg",
      gallery: [
        { src: "/yachts/fenides/gallery-1.jpg", alt: "Fenides aerial view" },
        { src: "/yachts/fenides/gallery-2.jpg", alt: "Fenides underway" },
        { src: "/yachts/fenides/gallery-3.jpg", alt: "Cocktails on board" },
        { src: "/yachts/fenides/gallery-1.jpg", alt: "Fenides from above" },
        { src: "/yachts/fenides/gallery-2.jpg", alt: "Fenides at sea" },
      ],
    },
  },

  // â”€â”€â”€ 11 Â· JAKARE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    slug: "jakare", name: "Jakare", firstName: "Jakare",
    locationBadge: "KOMODO", region: "Komodo",
    tier: "Explorer", cabinBookable: false,
    maxGuests: 14, length: "30 m", cabins: 5, build: "Indonesian phinisi",
    pricePerCabin: "$980", charterPrice: "$4,900", charterOnly: false,
    tagline: null,
    about: "Jakare is a 30-metre Komodo liveaboard with five cabins, running consistent 7-night circuits of the national park since 2016. An experienced local crew that has dived every site across multiple seasons.",
    departures: [
      { dates: "Jul 7 – Jul 14", duration: "7 nights", berths: "14 berths" },
      { dates: "Aug 11 – Aug 18", duration: "7 nights", berths: "14 berths" },
      { dates: "Sep 8 – Sep 15", duration: "7 nights", berths: "14 berths" },
    ],
    itinerary: KOMODO_7,
    conservation: `Jakare ${KOMODO_CONSERVATION}`,
images: {
      card: "/yachts/jakare/card.jpg",
      hero: "/yachts/jakare/hero.jpg",
      gallery: [
        { src: "/yachts/jakare/gallery-1.jpg", alt: "Jakare Dewi Sri cabin" },
        { src: "/yachts/jakare/gallery-2.jpg", alt: "Jakare Banggai cabin" },
        { src: "/yachts/jakare/gallery-1.jpg", alt: "Cabin interior" },
        { src: "/yachts/jakare/gallery-2.jpg", alt: "Cabin view" },
        { src: "/yachts/jakare/gallery-1.jpg", alt: "Jakare interior" },
      ],
    },
  },

  // â”€â”€â”€ 12 Â· JELAJAHI LAUT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    slug: "jelajahi-laut", name: "Jelajahi Laut", firstName: "Jelajahi",
    locationBadge: "RAJA AMPAT", region: "Raja Ampat",
    tier: "Explorer", cabinBookable: true,
    maxGuests: 12, length: "33 m", cabins: 6, build: "Indonesian phinisi",
    pricePerCabin: "$2,500", charterPrice: "$4,900", charterOnly: false,
    tagline: null,
    about: "Jelajahi Laut – 'Explore the Sea' – is a Raja Ampat phinisi focused on longer itineraries covering the Dampier Strait, Misool, and the remote northern sites around Kawe and Fam islands.",
    departures: [
      { dates: "Jul 19 – Jul 26", duration: "7 nights", berths: "12 berths" },
      { dates: "Aug 16 – Aug 23", duration: "7 nights", berths: "12 berths" },
      { dates: "Sep 20 – Sep 27", duration: "7 nights", berths: "12 berths" },
    ],
    itinerary: RAJA_AMPAT_7,
    conservation: `Jelajahi Laut ${RAJA_CONSERVATION}`,
images: {
      card: "/yachts/jelajahi-laut/card.webp",
      hero: "/yachts/jelajahi-laut/hero.webp",
      gallery: [
        { src: "/yachts/jelajahi-laut/gallery-1.webp", alt: "Sun deck captain cabin" },
        { src: "/yachts/jelajahi-laut/gallery-2.webp", alt: "Top sun deck" },
        { src: "/yachts/jelajahi-laut/gallery-3.webp", alt: "Dining room" },
        { src: "/yachts/jelajahi-laut/gallery-4.webp", alt: "Sea view cabin" },
        { src: "/yachts/jelajahi-laut/gallery-5.webp", alt: "Cabin balcony" },
      ],
    },
  },

  // â”€â”€â”€ 13 Â· KATHARINA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    slug: "katharina", name: "Katharina", firstName: "Katharina",
    locationBadge: "KOMODO", region: "Komodo",
    tier: "Premium", cabinBookable: false,
    maxGuests: 12, length: "55 m", cabins: 6, build: "Indonesian phinisi",
    pricePerCabin: "$887", charterPrice: "$4,250", charterOnly: false,
    tagline: null,
    about: "Katharina is a 55-metre Premium Komodo liveaboard with six spacious cabins and a wide dive deck. Known for its attentive service and knowledgeable guide team covering all of Komodo's signature sites.",
    departures: [
      { dates: "Jul 5 – Jul 12", duration: "7 nights", berths: "12 berths" },
      { dates: "Aug 9 – Aug 16", duration: "7 nights", berths: "12 berths" },
      { dates: "Sep 13 – Sep 20", duration: "7 nights", berths: "12 berths" },
    ],
    itinerary: KOMODO_7,
    conservation: `Katharina ${KOMODO_CONSERVATION}`,
images: {
      card: "/yachts/katharina/card.jpg",
      hero: "/yachts/katharina/hero.jpg",
      gallery: [
        { src: "/yachts/katharina/gallery-1.jpg", alt: "Katharina deck" },
        { src: "/yachts/katharina/gallery-2.jpg", alt: "Katharina sailing" },
        { src: "/yachts/katharina/gallery-1.jpg", alt: "Deck view" },
        { src: "/yachts/katharina/gallery-2.jpg", alt: "Under sail" },
        { src: "/yachts/katharina/gallery-1.jpg", alt: "Katharina at anchor" },
      ],
    },
  },

  // â”€â”€â”€ 14 Â· KUDANIL EXPLORER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    slug: "kudanil-explorer", name: "Kudanil Explorer", firstName: "Kudanil",
    locationBadge: "RAJA AMPAT", region: "Raja Ampat",
    tier: "Legend", cabinBookable: false,
    maxGuests: 16, length: "50 m", cabins: 7, build: "Traditional phinisi",
    pricePerCabin: "$3,331", charterPrice: "$25,250", charterOnly: false,
    tagline: null,
    about: "Kudanil Explorer is a 50-metre Legend-tier phinisi running premium Raja Ampat expeditions. Seven en-suite cabins, two dive decks, and a dedicated macro photography guide on every trip.",
    departures: [
      { dates: "Jul 12 – Jul 19", duration: "7 nights", berths: "16 berths" },
      { dates: "Aug 16 – Aug 23", duration: "7 nights", berths: "16 berths" },
      { dates: "Sep 20 – Sep 27", duration: "7 nights", berths: "16 berths" },
    ],
    itinerary: RAJA_AMPAT_7,
    conservation: `Kudanil Explorer ${RAJA_CONSERVATION}`,
images: {
      card: "/yachts/kudanil-explorer/card.jpg",
      hero: "/yachts/kudanil-explorer/hero.jpg",
      gallery: [
        { src: "/yachts/kudanil-explorer/gallery-1.jpg", alt: "Main deck dining room" },
        { src: "/yachts/kudanil-explorer/gallery-2.jpg", alt: "Stateroom cabin 7" },
        { src: "/yachts/kudanil-explorer/gallery-3.jpg", alt: "Komodo dive platform" },
        { src: "/yachts/kudanil-explorer/gallery-4.jpg", alt: "Monkey island jacuzzi" },
        { src: "/yachts/kudanil-explorer/gallery-1.jpg", alt: "Dining area" },
      ],
    },
  },

  // â”€â”€â”€ 15 Â· LAMIMA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    slug: "lamima", name: "Lamima", firstName: "Lamima",
    locationBadge: "KOMODO", region: "Komodo",
    tier: "", cabinBookable: false,
    maxGuests: 14, length: "60 m", cabins: 7, build: "Traditional phinisi",
    pricePerCabin: "$3,571", charterPrice: "$25,000", charterOnly: false,
    tagline: null,
    about: "Lamima is one of Indonesia's largest traditionally-built wooden phinisi at 60 metres. Seven spacious cabins, a large open deck, and itineraries that cover both Komodo and the Banda Sea.",
    departures: [
      { dates: "Jul 21 – Jul 28", duration: "7 nights", berths: "14 berths" },
      { dates: "Aug 25 – Sep 1", duration: "7 nights", berths: "14 berths" },
      { dates: "Sep 22 – Sep 29", duration: "7 nights", berths: "14 berths" },
    ],
    itinerary: KOMODO_7,
    conservation: `Lamima ${KOMODO_CONSERVATION}`,
images: {
      card: "/yachts/lamima/card.webp",
      hero: "/yachts/lamima/hero.webp",
      gallery: [
        { src: "/yachts/lamima/gallery-1.webp", alt: "Lamima sundeck" },
        { src: "/yachts/lamima/gallery-2.webp", alt: "Lamima at anchor" },
        { src: "/yachts/lamima/gallery-3.webp", alt: "Lamima beach stop" },
        { src: "/yachts/lamima/gallery-4.webp", alt: "Lamima under sail" },
        { src: "/yachts/lamima/gallery-5.webp", alt: "Guest cabin" },
      ],
    },
  },

  // â”€â”€â”€ 16 Â· MAJIK â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    slug: "majik", name: "Majik", firstName: "Majik",
    locationBadge: "RAJA AMPAT", region: "Raja Ampat",
    tier: "", cabinBookable: false,
    maxGuests: 8, length: "50 m", cabins: 4, build: "Indonesian phinisi",
    pricePerCabin: "$1,425", charterPrice: "$5,700", charterOnly: false,
    tagline: null,
    about: "Majik is a sleek 50-metre phinisi with four oversized cabins for small groups wanting privacy and space in Raja Ampat. Intimate feel on a large vessel with a personal crew-to-guest ratio.",
    departures: [
      { dates: "Jul 5 – Jul 12", duration: "7 nights", berths: "8 berths" },
      { dates: "Aug 2 – Aug 9", duration: "7 nights", berths: "8 berths" },
      { dates: "Sep 6 – Sep 13", duration: "7 nights", berths: "8 berths" },
    ],
    itinerary: RAJA_AMPAT_7,
    conservation: `Majik ${RAJA_CONSERVATION}`,
images: {
      card: "/yachts/majik/card.webp",
      hero: "/yachts/majik/hero.webp",
      gallery: [
        { src: "/yachts/majik/gallery-1.webp", alt: "Majik cruise" },
        { src: "/yachts/majik/gallery-2.webp", alt: "Majik liveaboard" },
        { src: "/yachts/majik/gallery-3.webp", alt: "On deck" },
        { src: "/yachts/majik/gallery-4.webp", alt: "Deck view" },
        { src: "/yachts/majik/gallery-5.webp", alt: "Majik at anchor" },
      ],
    },
  },

  // MERMAID I
  {
    slug: "mermaid-i", name: "Mermaid I", firstName: "Mermaid I",
    locationBadge: "KOMODO", region: "Komodo",
    tier: "Premium", cabinBookable: true,
    maxGuests: 15, length: "28 m", cabins: 8, build: "Twin-engine steel motor yacht",
    pricePerCabin: "Quote on request", charterPrice: null, charterOnly: false,
    tagline: "Award-winning Indonesian dive liveaboard with a comfort-first steel hull.",
    about: "Mermaid I is a 28-metre twin-engine steel liveaboard built around serious diving comfort. She carries up to 15 guests in eight cabins and runs Mermaid Liveaboards' signature Indonesia circuits, including Bali-Komodo-Bali, Raja Ampat, Ambon, Banda Sea, Alor, Lembeh, Halmahera, the Forgotten Islands, and Ring of Fire routes.",
    departures: [
      { dates: "Jul 12 - Jul 21", duration: "10 days / 9 nights", berths: "15 berths" },
      { dates: "Sep 20 - Oct 1", duration: "12 days / 11 nights", berths: "15 berths" },
      { dates: "Nov 28 - Dec 9", duration: "12 days / 11 nights", berths: "15 berths" },
    ],
    itinerary: KOMODO_7,
    conservation: `Mermaid I ${KOMODO_CONSERVATION}`,
images: {
      card: "/yachts/mermaid-i/card.webp",
      hero: "/yachts/mermaid-i/hero.webp",
      gallery: [
        { src: "/yachts/mermaid-i/gallery-1.webp", alt: "Mermaid I liveaboard at sea" },
        { src: "/yachts/mermaid-i/gallery-2.webp", alt: "Mermaid I sun deck" },
        { src: "/yachts/mermaid-i/gallery-3.webp", alt: "Mermaid I saloon" },
        { src: "/yachts/mermaid-i/gallery-4.webp", alt: "Mermaid I deluxe cabin" },
        { src: "/yachts/mermaid-i/gallery-5.webp", alt: "Mermaid I party deck" },
      ],
    },
  },

  // MERMAID II
  {
    slug: "mermaid-ii", name: "Mermaid II", firstName: "Mermaid II",
    locationBadge: "RAJA AMPAT", region: "Raja Ampat",
    tier: "Premium", cabinBookable: true,
    maxGuests: 20, length: "33 m", cabins: 9, build: "Twin-engine steel motor yacht",
    pricePerCabin: "Quote on request", charterPrice: null, charterOnly: false,
    tagline: "Comfortable steel dive boat for Mermaid's Komodo and Raja Ampat seasons.",
    about: "M/V Mermaid II is a 33-metre twin-engine steel liveaboard and one of Mermaid's most flexible Indonesia dive vessels. She accommodates up to 20 guests across eight main-deck deluxe cabins plus a lower-deck budget cabin, with panoramic sea-view windows in the deluxe cabins and a practical dive-boat layout for Komodo, Raja Ampat, Banda Sea, Alor, Lembeh, Halmahera, and extended transition routes.",
    departures: [
      { dates: "Jul 4 - Jul 11", duration: "8 days / 7 nights", berths: "20 berths" },
      { dates: "Dec 3 - Dec 11", duration: "9 days / 8 nights", berths: "20 berths" },
      { dates: "Jan 8 - Jan 16", duration: "9 days / 8 nights", berths: "20 berths" },
    ],
    itinerary: RAJA_AMPAT_7,
    conservation: `Mermaid II ${RAJA_CONSERVATION}`,
images: {
      card: "/yachts/mermaid-ii/card.webp",
      hero: "/yachts/mermaid-ii/hero.webp",
      gallery: [
        { src: "/yachts/mermaid-ii/gallery-1.webp", alt: "Mermaid II liveaboard underway" },
        { src: "/yachts/mermaid-ii/gallery-2.webp", alt: "Mermaid II sun deck" },
        { src: "/yachts/mermaid-ii/gallery-3.webp", alt: "Mermaid II saloon" },
        { src: "/yachts/mermaid-ii/gallery-4.webp", alt: "Mermaid II restaurant" },
        { src: "/yachts/mermaid-ii/gallery-5.webp", alt: "Mermaid II deluxe double cabin" },
      ],
    },
  },

  // BAJAK
  {
    slug: "bajak", name: "Bajak", firstName: "Bajak",
    locationBadge: "KOMODO", region: "Komodo",
    tier: "Explorer", cabinBookable: true,
    maxGuests: 14, length: "28 m", cabins: 4, build: "Reclaimed ironwood and teak phinisi",
    pricePerCabin: "Quote on request", charterPrice: null, charterOnly: false,
    tagline: "A spacious Komodo phinisi with a pirate soul and relaxed dive-deck rhythm.",
    about: "Bajak is a 28-metre Komodo liveaboard built from reclaimed ironwood and teak. She hosts up to 14 guests across four cabins and operates exclusively inside Komodo National Park, pairing generous lounging areas, a peaceful dive deck, and solar-powered quiet time with flexible liveaboard and private-charter trips.",
    departures: [
      { dates: "Request live dates", duration: "4 days / 3 nights", berths: "14 berths" },
      { dates: "Request live dates", duration: "5 days / 4 nights", berths: "14 berths" },
      { dates: "Private charter on request", duration: "Custom Komodo route", berths: "14 berths" },
    ],
    itinerary: KOMODO_7,
    conservation: `Bajak ${KOMODO_CONSERVATION}`,
images: {
      card: "/yachts/bajak/card.webp",
      hero: "/yachts/bajak/hero.webp",
      gallery: [
        { src: "/yachts/bajak/gallery-1.webp", alt: "Bajak liveaboard in Komodo National Park" },
        { src: "/yachts/bajak/gallery-2.webp", alt: "Bajak vessel profile" },
        { src: "/yachts/bajak/gallery-3.webp", alt: "Bajak dive briefing area" },
        { src: "/yachts/bajak/gallery-4.webp", alt: "Bajak shared cabin" },
        { src: "/yachts/bajak/gallery-5.webp", alt: "Bajak dive deck and water access" },
      ],
    },
  },

  // CAPOENG
  {
    slug: "capoeng", name: "Capoeng", firstName: "Capoeng",
    locationBadge: "KOMODO", region: "Komodo",
    tier: "Explorer", cabinBookable: true,
    maxGuests: 8, length: "18 m", cabins: 4, build: "Traditional Indonesian liveaboard",
    pricePerCabin: "Quote on request", charterPrice: null, charterOnly: false,
    tagline: "A compact small-group Komodo liveaboard built for eat, dive, sleep, repeat days.",
    about: "Capoeng is Scuba Republic's compact Komodo liveaboard for divers who want a friendly, authentic boat with modern comfort. She carries eight guests in four cabins, runs three-day Komodo routes with signature sites such as Shotgun, Crystal Rock, Castle Rock, Wae Nilu, and Rinca, and keeps the atmosphere casual between dives.",
    departures: [
      { dates: "Request live dates", duration: "3 days / 2 nights", berths: "8 berths" },
      { dates: "Request live dates", duration: "Private short Komodo charter", berths: "8 berths" },
      { dates: "Seasonal departures", duration: "Komodo dive circuit", berths: "8 berths" },
    ],
    itinerary: KOMODO_7,
    conservation: `Capoeng ${KOMODO_CONSERVATION}`,
images: {
      card: "/yachts/capoeng/card.webp",
      hero: "/yachts/capoeng/hero.webp",
      gallery: [
        { src: "/yachts/capoeng/gallery-1.webp", alt: "Capoeng liveaboard in Komodo" },
        { src: "/yachts/capoeng/gallery-2.webp", alt: "Capoeng on a Komodo liveaboard route" },
        { src: "/yachts/capoeng/gallery-3.webp", alt: "Capoeng dive deck" },
        { src: "/yachts/capoeng/gallery-4.webp", alt: "Capoeng in Komodo National Park" },
        { src: "/yachts/capoeng/gallery-5.webp", alt: "Capoeng cabin" },
      ],
    },
  },

  // JAYA
  {
    slug: "jaya", name: "Jaya", firstName: "Jaya",
    locationBadge: "RAJA AMPAT", region: "Raja Ampat",
    tier: "Explorer", cabinBookable: true,
    maxGuests: 14, length: "23 m", cabins: 7, build: "Built 1999, refreshed expedition phinisi",
    pricePerCabin: "Quote on request", charterPrice: null, charterOnly: false,
    tagline: "Scuba Republic's expedition vessel for Raja Ampat and long-range Indonesian routes.",
    about: "Jaya is Scuba Republic's expedition liveaboard, a 23-metre phinisi-style vessel that moves seasonally through Raja Ampat and longer routes such as Alor, Ambon, Maumere, and Banda. She carries 14 guests in seven cabins, with a shaded upper deck, dedicated dive deck, AC cabins, shared and en-suite bathroom layouts, and free WiFi aboard.",
    departures: [
      { dates: "Request live dates", duration: "Raja Ampat season", berths: "14 berths" },
      { dates: "Request live dates", duration: "Long-range expedition", berths: "14 berths" },
      { dates: "Private charter on request", duration: "Custom expedition route", berths: "14 berths" },
    ],
    itinerary: RAJA_AMPAT_7,
    conservation: `Jaya ${RAJA_CONSERVATION}`,
images: {
      card: "/yachts/jaya/card.webp",
      hero: "/yachts/jaya/hero.webp",
      gallery: [
        { src: "/yachts/jaya/gallery-1.webp", alt: "Jaya interior lounge and dining area" },
        { src: "/yachts/jaya/gallery-2.webp", alt: "Jaya guest cabin" },
        { src: "/yachts/jaya/gallery-3.webp", alt: "Jaya shaded upper deck" },
        { src: "/yachts/jaya/gallery-4.webp", alt: "Jaya liveaboard deck" },
        { src: "/yachts/jaya/gallery-5.webp", alt: "Jaya double cabin" },
      ],
    },
  },

  // EPICA
  {
    slug: "epica", name: "Epica", firstName: "Epica",
    locationBadge: "RAJA AMPAT", region: "Raja Ampat",
    tier: "Explorer", cabinBookable: true,
    maxGuests: 12, length: "24 m", cabins: 6, build: "Refitted traditional fishing boat",
    pricePerCabin: "Quote on request", charterPrice: null, charterOnly: false,
    tagline: "A budget-friendly Raja Ampat dive liveaboard with AC cabins and real expedition access.",
    about: "Epica is a 24-metre Raja Ampat liveaboard operated by Scuba Republic for guests who want access to world-class dive sites at a lighter budget. The traditional fishing boat has been refitted for diving, carries 12 guests in six AC cabins with bunk beds, and keeps shared spaces simple, social, and close to the water.",
    departures: [
      { dates: "Request live dates", duration: "Raja Ampat season", berths: "12 berths" },
      { dates: "Request live dates", duration: "Short Raja Ampat dive trip", berths: "12 berths" },
      { dates: "Private charter on request", duration: "Custom Raja Ampat route", berths: "12 berths" },
    ],
    itinerary: RAJA_AMPAT_7,
    conservation: `Epica ${RAJA_CONSERVATION}`,
images: {
      card: "/yachts/epica/card.webp",
      hero: "/yachts/epica/hero.webp",
      gallery: [
        { src: "/yachts/epica/gallery-1.webp", alt: "Epica dinghy and dive tender" },
        { src: "/yachts/epica/gallery-2.webp", alt: "Epica guests in Raja Ampat" },
        { src: "/yachts/epica/gallery-3.webp", alt: "Epica dining area" },
        { src: "/yachts/epica/gallery-4.webp", alt: "Epica liveaboard side profile" },
        { src: "/yachts/epica/gallery-5.webp", alt: "Epica dive deck" },
      ],
    },
  },

  // â”€â”€â”€ 17 Â· MISCHIEF â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    slug: "mischief", name: "Mischief", firstName: "Mischief",
    locationBadge: "KOMODO", region: "Komodo",
    tier: "Premium", cabinBookable: false,
    maxGuests: 6, length: "50 m", cabins: 3, build: "Indonesian phinisi",
    pricePerCabin: "$2,667", charterPrice: "$8,000", charterOnly: false,
    tagline: null,
    about: "Mischief is a Premium Komodo phinisi built for small groups who want space and quality. Three large en-suite cabins, a private dive platform, and a route that avoids crowded anchorages.",
    departures: [
      { dates: "Jul 7 – Jul 14", duration: "7 nights", berths: "6 berths" },
      { dates: "Aug 11 – Aug 18", duration: "7 nights", berths: "6 berths" },
      { dates: "Sep 8 – Sep 15", duration: "7 nights", berths: "6 berths" },
    ],
    itinerary: KOMODO_7,
    conservation: `Mischief ${KOMODO_CONSERVATION}`,
images: {
      card: "/yachts/mischief/card.webp",
      hero: "/yachts/mischief/hero.webp",
      gallery: [
        { src: "/yachts/mischief/gallery-1.webp", alt: "Mischief exterior" },
        { src: "/yachts/mischief/gallery-2.webp", alt: "Deck" },
        { src: "/yachts/mischief/gallery-3.webp", alt: "Salon" },
        { src: "/yachts/mischief/gallery-4.webp", alt: "Interior" },
        { src: "/yachts/mischief/gallery-5.webp", alt: "Aft deck" },
      ],
    },
  },

  // â”€â”€â”€ 18 Â· MUTIARA LAUT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    slug: "mutiara-laut", name: "Mutiara Laut", firstName: "Mutiara",
    locationBadge: "KOMODO", region: "Komodo",
    tier: "", cabinBookable: false,
    maxGuests: 10, length: "40 m", cabins: 5, build: "Indonesian phinisi",
    pricePerCabin: "$1,929", charterPrice: "$13,500", charterOnly: false,
    tagline: null,
    about: "Mutiara Laut is a reliable Komodo liveaboard with a strong local crew and a well-maintained dive operation. Covers all national park sites on a 7-night circuit from Labuan Bajo.",
    departures: [
      { dates: "Jul 14 – Jul 21", duration: "7 nights", berths: "10 berths" },
      { dates: "Aug 18 – Aug 25", duration: "7 nights", berths: "10 berths" },
      { dates: "Sep 22 – Sep 29", duration: "7 nights", berths: "10 berths" },
    ],
    itinerary: KOMODO_7,
    conservation: `Mutiara Laut ${KOMODO_CONSERVATION}`,
images: {
      card: "/yachts/mutiara-laut/card.webp",
      hero: "/yachts/mutiara-laut/hero.webp",
      gallery: [
        { src: "/yachts/mutiara-laut/gallery-1.webp", alt: "Mutiara Laut exterior" },
        { src: "/yachts/mutiara-laut/gallery-2.webp", alt: "On deck" },
        { src: "/yachts/mutiara-laut/gallery-3.webp", alt: "Interior" },
        { src: "/yachts/mutiara-laut/gallery-4.webp", alt: "Deck view" },
        { src: "/yachts/mutiara-laut/gallery-5.webp", alt: "At anchor" },
      ],
    },
  },

  // â”€â”€â”€ 19 Â· OMBAK PUTIH â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    slug: "ombak-putih", name: "Ombak Putih", firstName: "Ombak",
    locationBadge: "KOMODO", region: "Komodo",
    tier: "Premium", cabinBookable: true,
    maxGuests: 34, length: "42 m", cabins: 12, build: "Traditional tall ship",
    pricePerCabin: "$5,200", charterPrice: "$60,400", charterOnly: false,
    tagline: null,
    about: "Ombak Putih is a 42-metre traditional tall ship with 12 cabins – the largest cabin-bookable liveaboard in the BluePass fleet. Runs group expeditions through Komodo and beyond.",
    departures: [
      { dates: "Jul 7 – Jul 14", duration: "7 nights", berths: "34 berths" },
      { dates: "Aug 4 – Aug 11", duration: "7 nights", berths: "34 berths" },
      { dates: "Sep 1 – Sep 8", duration: "7 nights", berths: "34 berths" },
    ],
    itinerary: KOMODO_7,
    conservation: `Ombak Putih ${KOMODO_CONSERVATION}`,
images: {
      card: "/yachts/ombak-putih/card.jpg",
      hero: "/yachts/ombak-putih/hero.jpg",
      gallery: [
        { src: "/yachts/ombak-putih/gallery-1.jpg", alt: "Ombak Putih exterior" },
        { src: "/yachts/ombak-putih/gallery-2.webp", alt: "Rear deck" },
        { src: "/yachts/ombak-putih/gallery-3.jpg", alt: "Under sail" },
        { src: "/yachts/ombak-putih/gallery-4.jpg", alt: "Ombak Putih sailing" },
        { src: "/yachts/ombak-putih/gallery-5.webp", alt: "Deck view" },
      ],
    },
  },

  // â”€â”€â”€ 20 Â· ORACLE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    slug: "oracle", name: "Oracle", firstName: "Oracle",
    locationBadge: "KOMODO", region: "Komodo",
    tier: "Explorer", cabinBookable: false,
    maxGuests: 5, length: "36 m", cabins: 5, build: "Indonesian phinisi",
    pricePerCabin: "$1,983", charterPrice: "$9,392", charterOnly: false,
    tagline: null,
    about: "Oracle is a compact Komodo phinisi with five private cabins for groups of up to five guests. Excellent guide-to-guest ratio and flexible daily scheduling based on conditions.",
    departures: [
      { dates: "Jul 21 – Jul 28", duration: "7 nights", berths: "5 berths" },
      { dates: "Aug 25 – Sep 1", duration: "7 nights", berths: "5 berths" },
      { dates: "Sep 29 – Oct 6", duration: "7 nights", berths: "5 berths" },
    ],
    itinerary: KOMODO_7,
    conservation: `Oracle ${KOMODO_CONSERVATION}`,
images: {
      card: "/yachts/oracle/card.webp",
      hero: "/yachts/oracle/hero.webp",
      gallery: [
        { src: "/yachts/oracle/gallery-1.webp", alt: "Oracle exterior" },
        { src: "/yachts/oracle/gallery-2.webp", alt: "Oracle deck" },
        { src: "/yachts/oracle/gallery-3.webp", alt: "On board" },
        { src: "/yachts/oracle/gallery-4.webp", alt: "Interior" },
        { src: "/yachts/oracle/gallery-5.webp", alt: "Sailing" },
      ],
    },
  },

  // â”€â”€â”€ 21 Â· PRANA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    slug: "prana", name: "Prana", firstName: "Prana",
    locationBadge: "KOMODO", region: "Komodo",
    tier: "Legend", cabinBookable: false,
    maxGuests: 8, length: "55 m", cabins: 9, build: "Indonesian phinisi",
    pricePerCabin: "$2,000", charterPrice: "$8,000", charterOnly: false,
    tagline: null,
    about: "Prana is a 55-metre Legend-tier phinisi offering nine en-suite cabins with private balconies. Runs exclusive Komodo itineraries with a 2:1 crew-to-guest ratio and spa facilities.",
    departures: [
      { dates: "Jul 5 – Jul 12", duration: "7 nights", berths: "8 berths" },
      { dates: "Aug 9 – Aug 16", duration: "7 nights", berths: "8 berths" },
      { dates: "Sep 13 – Sep 20", duration: "7 nights", berths: "8 berths" },
    ],
    itinerary: KOMODO_7,
    conservation: `Prana ${KOMODO_CONSERVATION}`,
images: {
      card: "/yachts/prana/card.webp",
      hero: "/yachts/prana/hero.webp",
      gallery: [
        { src: "/yachts/prana/gallery-1.webp", alt: "Batavia suite" },
        { src: "/yachts/prana/gallery-2.webp", alt: "Misool suite" },
        { src: "/yachts/prana/gallery-3.webp", alt: "Banda suite" },
        { src: "/yachts/prana/gallery-4.webp", alt: "Ambon suite" },
        { src: "/yachts/prana/gallery-5.webp", alt: "Dining area" },
      ],
    },
  },

  // â”€â”€â”€ 22 Â· RASCAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    slug: "rascal", name: "Rascal", firstName: "Rascal",
    locationBadge: "KOMODO", region: "Komodo",
    tier: "Premium", cabinBookable: true,
    maxGuests: 10, length: "30 m", cabins: 5, build: "Indonesian phinisi",
    pricePerCabin: "$2,500", charterPrice: "$12,500", charterOnly: false,
    tagline: null,
    about: "Rascal is a 30-metre Premium Komodo liveaboard with five en-suite cabins bookable per-cabin. Well regarded for its consistently high dive guide quality and its accessible pricing for the Premium tier.",
    departures: [
      { dates: "Jul 7 – Jul 14", duration: "7 nights", berths: "10 berths" },
      { dates: "Aug 4 – Aug 11", duration: "7 nights", berths: "10 berths" },
      { dates: "Sep 1 – Sep 8", duration: "7 nights", berths: "10 berths" },
    ],
    itinerary: KOMODO_7,
    conservation: `Rascal ${KOMODO_CONSERVATION}`,
images: {
      card: "/yachts/rascal/card.jpg",
      hero: "/yachts/rascal/hero.jpg",
      gallery: [
        { src: "/yachts/rascal/gallery-1.jpg", alt: "Rascal exterior" },
        { src: "/yachts/rascal/gallery-2.jpg", alt: "Interior" },
        { src: "/yachts/rascal/gallery-3.jpg", alt: "Outdoor deck" },
        { src: "/yachts/rascal/gallery-4.jpg", alt: "Exterior view" },
        { src: "/yachts/rascal/gallery-5.jpg", alt: "Deck" },
      ],
    },
  },

  // â”€â”€â”€ 23 Â· REBEL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    slug: "rebel", name: "Rebel", firstName: "Rebel",
    locationBadge: "RAJA AMPAT", region: "Raja Ampat",
    tier: "Premium", cabinBookable: true,
    maxGuests: 10, length: "31 m", cabins: 5, build: "Indonesian phinisi",
    pricePerCabin: "$2,500", charterPrice: "$12,500", charterOnly: false,
    tagline: null,
    about: "Rebel is a 31-metre Premium Raja Ampat phinisi with five en-suite cabins. Runs cabin-bookable 7-night circuits of the Bird's Head Seascape with a well-rated local dive team.",
    departures: [
      { dates: "Jul 19 – Jul 26", duration: "7 nights", berths: "10 berths" },
      { dates: "Aug 23 – Aug 30", duration: "7 nights", berths: "10 berths" },
      { dates: "Sep 27 – Oct 4", duration: "7 nights", berths: "10 berths" },
    ],
    itinerary: RAJA_AMPAT_7,
    conservation: `Rebel ${RAJA_CONSERVATION}`,
images: {
      card: "/yachts/rebel/card.jpg",
      hero: "/yachts/rebel/hero.jpg",
      gallery: [
        { src: "/yachts/rebel/gallery-1.jpg", alt: "Rebel interior" },
        { src: "/yachts/rebel/gallery-2.jpg", alt: "Gallery interior" },
        { src: "/yachts/rebel/gallery-3.jpg", alt: "Gallery view" },
        { src: "/yachts/rebel/gallery-4.jpg", alt: "On board" },
        { src: "/yachts/rebel/gallery-5.jpg", alt: "Rebel deck" },
      ],
    },
  },

  // â”€â”€â”€ 24 Â· SAMARA I â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    slug: "samara-i", name: "Samara I", firstName: "Samara",
    locationBadge: "KOMODO", region: "Komodo",
    tier: "Explorer", cabinBookable: true,
    maxGuests: 13, length: "27 m", cabins: 6, build: "Indonesian phinisi",
    pricePerCabin: "$1,690", charterPrice: "$4,000", charterOnly: false,
    tagline: null,
    about: "Samara I is an Explorer-tier Komodo liveaboard with six cabins, well-suited to mixed groups and photographers. Consistent guide team and a camera-dedicated rinse station.",
    departures: [
      { dates: "Jul 14 – Jul 21", duration: "7 nights", berths: "13 berths" },
      { dates: "Aug 18 – Aug 25", duration: "7 nights", berths: "13 berths" },
      { dates: "Sep 15 – Sep 22", duration: "7 nights", berths: "13 berths" },
    ],
    itinerary: KOMODO_7,
    conservation: `Samara I ${KOMODO_CONSERVATION}`,
images: {
      card: "/yachts/samara-i/card.webp",
      hero: "/yachts/samara-i/hero.webp",
      gallery: [
        { src: "/yachts/samara-i/gallery-1.webp", alt: "Samara I deck" },
        { src: "/yachts/samara-i/gallery-2.webp", alt: "Samara I view" },
        { src: "/yachts/samara-i/gallery-3.webp", alt: "On deck" },
        { src: "/yachts/samara-i/gallery-4.webp", alt: "Interior" },
        { src: "/yachts/samara-i/gallery-5.webp", alt: "At anchor" },
      ],
    },
  },

  // â”€â”€â”€ 25 Â· SAMSARA SAMUDRA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    slug: "samsara-samudra", name: "Samsara Samudra", firstName: "Samsara",
    locationBadge: "KOMODO", region: "Komodo",
    tier: "Premium", cabinBookable: false,
    maxGuests: 48, length: "42 m", cabins: 20, build: "Traditional tall ship",
    pricePerCabin: "$1,658", charterPrice: "$3,500", charterOnly: false,
    tagline: null,
    about: "Samsara Samudra is a 42-metre tall ship with 20 cabins, running large group expeditions through Komodo. Combines traditional sailing with comfortable shared spaces and a full dive operation.",
    departures: [
      { dates: "Jul 7 – Jul 14", duration: "7 nights", berths: "48 berths" },
      { dates: "Aug 11 – Aug 18", duration: "7 nights", berths: "48 berths" },
      { dates: "Sep 8 – Sep 15", duration: "7 nights", berths: "48 berths" },
    ],
    itinerary: KOMODO_7,
    conservation: `Samsara Samudra ${KOMODO_CONSERVATION}`,
images: {
      card: "/yachts/samsara-samudra/card.webp",
      hero: "/yachts/samsara-samudra/hero.webp",
      gallery: [
        { src: "/yachts/samsara-samudra/gallery-1.webp", alt: "Samsara Samudra exterior" },
        { src: "/yachts/samsara-samudra/gallery-2.webp", alt: "Exterior sailing" },
        { src: "/yachts/samsara-samudra/gallery-3.webp", alt: "Master suite" },
        { src: "/yachts/samsara-samudra/gallery-4.webp", alt: "On deck" },
        { src: "/yachts/samsara-samudra/gallery-5.webp", alt: "Living area" },
      ],
    },
  },

  // â”€â”€â”€ 26 Â· SANCTUARY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    slug: "sanctuary", name: "Sanctuary", firstName: "Sanctuary",
    locationBadge: "KOMODO", region: "Komodo",
    tier: "Premium", cabinBookable: false,
    maxGuests: 8, length: "30 m", cabins: 9, build: "Indonesian phinisi",
    pricePerCabin: "$1,500", charterPrice: "$13,500", charterOnly: false,
    tagline: null,
    about: "Sanctuary is a 30-metre Premium Komodo phinisi known for its warm crew and strong repeating guest base. Nine well-appointed cabins and an experienced guide team across all park sites.",
    departures: [
      { dates: "Jul 21 – Jul 28", duration: "7 nights", berths: "8 berths" },
      { dates: "Aug 25 – Sep 1", duration: "7 nights", berths: "8 berths" },
      { dates: "Sep 29 – Oct 6", duration: "7 nights", berths: "8 berths" },
    ],
    itinerary: KOMODO_7,
    conservation: `Sanctuary ${KOMODO_CONSERVATION}`,
images: {
      card: "/yachts/sanctuary/card.webp",
      hero: "/yachts/sanctuary/hero.webp",
      gallery: [
        { src: "/yachts/sanctuary/gallery-1.webp", alt: "Sanctuary facility" },
        { src: "/yachts/sanctuary/gallery-2.webp", alt: "Upper deck deluxe cabin" },
        { src: "/yachts/sanctuary/gallery-3.webp", alt: "Deluxe cabin view" },
        { src: "/yachts/sanctuary/gallery-4.webp", alt: "Lower deck cabin" },
        { src: "/yachts/sanctuary/gallery-5.webp", alt: "Master cabin" },
      ],
    },
  },


  // â”€â”€â”€ 28 Â· SHAKTI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    slug: "shakti", name: "Shakti", firstName: "Shakti",
    locationBadge: "RAJA AMPAT", region: "Raja Ampat",
    tier: "Explorer", cabinBookable: false,
    maxGuests: 12, length: "32 m", cabins: 6, build: "Indonesian phinisi",
    pricePerCabin: "Quote on request", charterPrice: null, charterOnly: false,
    tagline: null,
    about: "Shakti is an Explorer-tier Raja Ampat phinisi with six cabins. Pricing varies by season and group size – contact Kai for a personalised quote.",
    departures: [
      { dates: "Jul 12 – Jul 19", duration: "7 nights", berths: "12 berths" },
      { dates: "Aug 16 – Aug 23", duration: "7 nights", berths: "12 berths" },
      { dates: "Sep 20 – Sep 27", duration: "7 nights", berths: "12 berths" },
    ],
    itinerary: RAJA_AMPAT_7,
    conservation: `Shakti ${RAJA_CONSERVATION}`,
images: {
      card: "/yachts/shakti/card.webp",
      hero: "/yachts/shakti/hero.webp",
      gallery: [
        { src: "/yachts/shakti/gallery-1.webp", alt: "Shakti cabins" },
        { src: "/yachts/shakti/gallery-2.webp", alt: "Shakti vessel" },
        { src: "/yachts/shakti/gallery-3.jpg", alt: "Main deck" },
        { src: "/yachts/shakti/gallery-4.jpg", alt: "Boat plan" },
        { src: "/yachts/shakti/gallery-5.webp", alt: "Shakti at anchor" },
      ],
    },
  },

  // â”€â”€â”€ 29 Â· SI DATU BUA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    slug: "si-datu-bua", name: "Si Datu Bua", firstName: "Si Datu",
    locationBadge: "KOMODO", region: "Komodo",
    tier: "Premium", cabinBookable: false,
    maxGuests: 8, length: "40 m", cabins: 3, build: "Indonesian phinisi",
    pricePerCabin: "$4,000", charterPrice: "$12,000", charterOnly: false,
    tagline: null,
    about: "Si Datu Bua is a Premium Komodo phinisi with three oversized suites for small groups. Known for its exceptional onboard cuisine and a dive guide team ranked among the top in the national park.",
    departures: [
      { dates: "Jul 7 – Jul 14", duration: "7 nights", berths: "8 berths" },
      { dates: "Aug 4 – Aug 11", duration: "7 nights", berths: "8 berths" },
      { dates: "Sep 1 – Sep 8", duration: "7 nights", berths: "8 berths" },
    ],
    itinerary: KOMODO_7,
    conservation: `Si Datu Bua ${KOMODO_CONSERVATION}`,
images: {
      card: "/yachts/si-datu-bua/card.webp",
      hero: "/yachts/si-datu-bua/hero.webp",
      gallery: [
        { src: "/yachts/si-datu-bua/gallery-1.webp", alt: "Si Datu Bua exterior" },
        { src: "/yachts/si-datu-bua/gallery-2.webp", alt: "Deck view" },
        { src: "/yachts/si-datu-bua/gallery-3.webp", alt: "Interior" },
        { src: "/yachts/si-datu-bua/gallery-4.webp", alt: "Salon" },
        { src: "/yachts/si-datu-bua/gallery-5.webp", alt: "Cabin" },
      ],
    },
  },

  // â”€â”€â”€ 30 Â· SILOINA ONE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    slug: "siloina-one", name: "Siloina One", firstName: "Siloina",
    locationBadge: "KOMODO", region: "Komodo",
    tier: "", cabinBookable: false,
    maxGuests: 14, length: "40 m", cabins: 8, build: "Indonesian phinisi",
    pricePerCabin: "Quote on request", charterPrice: null, charterOnly: false,
    tagline: null,
    about: "Siloina One is a 40-metre Komodo phinisi with eight cabins. Runs seasonal circuits across the national park – pricing varies by group composition and departure date.",
    departures: [
      { dates: "Jul 21 – Jul 28", duration: "7 nights", berths: "14 berths" },
      { dates: "Aug 25 – Sep 1", duration: "7 nights", berths: "14 berths" },
      { dates: "Sep 29 – Oct 6", duration: "7 nights", berths: "14 berths" },
    ],
    itinerary: KOMODO_7,
    conservation: `Siloina One ${KOMODO_CONSERVATION}`,
images: {
      card: "/yachts/siloina-one/card.jpg",
      hero: "/yachts/siloina-one/hero.jpg",
      gallery: [
        { src: "/yachts/siloina-one/gallery-1.jpg", alt: "Siloina surf charter" },
        { src: "/yachts/siloina-one/gallery-2.jpg", alt: "Anchored at island" },
        { src: "/yachts/siloina-one/gallery-3.jpg", alt: "Beach stop" },
        { src: "/yachts/siloina-one/gallery-4.jpg", alt: "Surf charter" },
        { src: "/yachts/siloina-one/gallery-5.jpg", alt: "At anchor" },
      ],
    },
  },

  // â”€â”€â”€ 31 Â· SILOINA TWO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    slug: "siloina-two", name: "Siloina Two", firstName: "Siloina",
    locationBadge: "RAJA AMPAT", region: "Raja Ampat",
    tier: "", cabinBookable: false,
    maxGuests: 14, length: "40 m", cabins: 8, build: "Indonesian phinisi",
    pricePerCabin: "Quote on request", charterPrice: null, charterOnly: false,
    tagline: null,
    about: "Siloina Two is the Raja Ampat sister vessel of Siloina One – 40 metres, eight cabins, running the full Bird's Head circuit from Sorong.",
    departures: [
      { dates: "Jul 5 – Jul 12", duration: "7 nights", berths: "14 berths" },
      { dates: "Aug 9 – Aug 16", duration: "7 nights", berths: "14 berths" },
      { dates: "Sep 6 – Sep 13", duration: "7 nights", berths: "14 berths" },
    ],
    itinerary: RAJA_AMPAT_7,
    conservation: `Siloina Two ${RAJA_CONSERVATION}`,
images: {
      card: "/yachts/siloina-two/card.jpg",
      hero: "/yachts/siloina-two/hero.jpg",
      gallery: [
        { src: "/yachts/siloina-two/gallery-1.jpg", alt: "Siloina Two surf charter" },
        { src: "/yachts/siloina-two/gallery-2.jpg", alt: "Anchored at island" },
        { src: "/yachts/siloina-two/gallery-3.jpg", alt: "Beach stop" },
        { src: "/yachts/siloina-two/gallery-4.jpg", alt: "Surf charter" },
        { src: "/yachts/siloina-two/gallery-5.jpg", alt: "At anchor" },
      ],
    },
  },

  // â”€â”€â”€ 32 Â· SILOLONA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    slug: "silolona", name: "Silolona", firstName: "Silolona",
    locationBadge: "KOMODO", region: "Komodo",
    tier: "Premium", cabinBookable: false,
    maxGuests: 12, length: "50 m", cabins: 5, build: "Traditional phinisi",
    pricePerCabin: "$4,200", charterPrice: "$21,000", charterOnly: false,
    tagline: null,
    about: "Silolona is a 50-metre Premium phinisi with five exquisitely-appointed cabins. Widely recognised as one of the finest traditional sailing yachts in Southeast Asia, covering Komodo's most dramatic sites.",
    departures: [
      { dates: "Jul 14 – Jul 21", duration: "7 nights", berths: "12 berths" },
      { dates: "Aug 18 – Aug 25", duration: "7 nights", berths: "12 berths" },
      { dates: "Sep 22 – Sep 29", duration: "7 nights", berths: "12 berths" },
    ],
    itinerary: KOMODO_7,
    conservation: `Silolona ${KOMODO_CONSERVATION}`,
images: {
      card: "/yachts/silolona/card.webp",
      hero: "/yachts/silolona/hero.webp",
      gallery: [
        { src: "/yachts/silolona/gallery-1.webp", alt: "Silolona under sail" },
        { src: "/yachts/silolona/gallery-2.webp", alt: "Silolona sailing" },
        { src: "/yachts/silolona/gallery-3.webp", alt: "Silolona at sea" },
        { src: "/yachts/silolona/gallery-4.webp", alt: "Main deck" },
        { src: "/yachts/silolona/gallery-5.webp", alt: "Fore deck" },
      ],
    },
  },

  // â”€â”€â”€ 33 Â· TABULA RASA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    slug: "tabula-rasa", name: "Tabula Rasa", firstName: "Tabula",
    locationBadge: "RAJA AMPAT", region: "Raja Ampat",
    tier: "Premium", cabinBookable: false,
    maxGuests: 8, length: "22.8 m", cabins: 4, build: "Custom motor yacht",
    pricePerCabin: "$2,500", charterPrice: "$10,000", charterOnly: false,
    tagline: null,
    about: "Tabula Rasa is a 22.8-metre custom motor yacht with four en-suite cabins operating in Raja Ampat. Compact and fast – able to access remote dive sites before the larger fleet arrives.",
    departures: [
      { dates: "Jul 19 – Jul 26", duration: "7 nights", berths: "8 berths" },
      { dates: "Aug 23 – Aug 30", duration: "7 nights", berths: "8 berths" },
      { dates: "Sep 27 – Oct 4", duration: "7 nights", berths: "8 berths" },
    ],
    itinerary: RAJA_AMPAT_7,
    conservation: `Tabula Rasa ${RAJA_CONSERVATION}`,
images: {
      card: "/yachts/tabula-rasa/card.webp",
      hero: "/yachts/tabula-rasa/hero.webp",
      gallery: [
        { src: "/yachts/tabula-rasa/gallery-1.webp", alt: "Tabula Rasa hero" },
        { src: "/yachts/tabula-rasa/gallery-2.webp", alt: "Above deck" },
        { src: "/yachts/tabula-rasa/gallery-3.webp", alt: "Foredeck night" },
        { src: "/yachts/tabula-rasa/gallery-4.webp", alt: "Guest cabin" },
        { src: "/yachts/tabula-rasa/gallery-5.webp", alt: "Salon" },
      ],
    },
  },

  // â”€â”€â”€ 34 Â· VEDANTA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    slug: "vedanta", name: "Vedanta", firstName: "Vedanta",
    locationBadge: "RAJA AMPAT", region: "Raja Ampat",
    tier: "", cabinBookable: false,
    maxGuests: 6, length: "41 m", cabins: 5, build: "Indonesian phinisi",
    pricePerCabin: "$3,833", charterPrice: "$23,000", charterOnly: false,
    tagline: null,
    about: "Vedanta is a 41-metre Raja Ampat phinisi with five cabins for intimate groups of up to six guests. Excellent crew, quiet anchorages, and routes that go beyond the standard Bird's Head circuit.",
    departures: [
      { dates: "Jul 5 – Jul 12", duration: "7 nights", berths: "6 berths" },
      { dates: "Aug 9 – Aug 16", duration: "7 nights", berths: "6 berths" },
      { dates: "Sep 6 – Sep 13", duration: "7 nights", berths: "6 berths" },
    ],
    itinerary: RAJA_AMPAT_7,
    conservation: `Vedanta ${RAJA_CONSERVATION}`,
images: {
      card: "/yachts/vedanta/card.webp",
      hero: "/yachts/vedanta/hero.webp",
      gallery: [
        { src: "/yachts/vedanta/gallery-1.webp", alt: "Vedanta exterior" },
        { src: "/yachts/vedanta/gallery-2.webp", alt: "Deck plan view" },
        { src: "/yachts/vedanta/gallery-3.webp", alt: "Vedanta at sea" },
        { src: "/yachts/vedanta/gallery-4.webp", alt: "Deck" },
        { src: "/yachts/vedanta/gallery-5.webp", alt: "Vedanta sailing" },
      ],
    },
  },

  // â”€â”€â”€ 35 Â· VELA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    slug: "vela", name: "Vela", firstName: "Vela",
    locationBadge: "KOMODO", region: "Komodo",
    tier: "Legend", cabinBookable: false,
    maxGuests: 12, length: "42 m", cabins: 5, build: "Traditional phinisi",
    pricePerCabin: "$2,847", charterPrice: "$17,000", charterOnly: false,
    tagline: null,
    about: "Vela is a 42-metre Legend-tier Komodo phinisi with five exquisitely-appointed cabins, a sun deck Jacuzzi, and an in-house marine biologist available on every trip.",
    departures: [
      { dates: "Jul 7 – Jul 14", duration: "7 nights", berths: "12 berths" },
      { dates: "Aug 4 – Aug 11", duration: "7 nights", berths: "12 berths" },
      { dates: "Sep 1 – Sep 8", duration: "7 nights", berths: "12 berths" },
    ],
    itinerary: KOMODO_7,
    conservation: `Vela ${KOMODO_CONSERVATION}`,
images: {
      card: "/yachts/vela/card.jpg",
      hero: "/yachts/vela/hero.jpg",
      gallery: [
        { src: "/yachts/vela/gallery-1.jpg", alt: "Vela master suite" },
        { src: "/yachts/vela/gallery-2.jpg", alt: "Master suite view" },
        { src: "/yachts/vela/gallery-3.jpg", alt: "Owner suite" },
        { src: "/yachts/vela/gallery-4.jpg", alt: "Owner suite view" },
        { src: "/yachts/vela/gallery-5.jpg", alt: "Vela interior" },
      ],
    },
  },

  // â”€â”€â”€ 36 Â· ZEN SCUBA SPA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    slug: "zen-scuba-spa", name: "Zen Scuba Spa", firstName: "Zen",
    locationBadge: "RAJA AMPAT", region: "Raja Ampat",
    tier: "Premium", cabinBookable: false,
    maxGuests: 20, length: "40 m", cabins: 8, build: "Steel liveaboard",
    pricePerCabin: "$8,768", charterPrice: "$35,000", charterOnly: false,
    tagline: null,
    about: "Zen Scuba Spa combines a full spa operation with Raja Ampat's best dive sites. Eight cabins, an onboard massage suite, a hot tub, and a certified yoga instructor available during surface intervals.",
    departures: [
      { dates: "Jul 12 – Jul 19", duration: "7 nights", berths: "20 berths" },
      { dates: "Aug 16 – Aug 23", duration: "7 nights", berths: "20 berths" },
      { dates: "Sep 20 – Sep 27", duration: "7 nights", berths: "20 berths" },
    ],
    itinerary: RAJA_AMPAT_7,
    conservation: `Zen Scuba Spa ${RAJA_CONSERVATION}`,
images: {
      card: "/yachts/zen-scuba-spa/card.webp",
      hero: "/yachts/zen-scuba-spa/hero.webp",
      gallery: [
        { src: "/yachts/zen-scuba-spa/gallery-1.webp", alt: "Zen Scuba Spa boat" },
        { src: "/yachts/zen-scuba-spa/gallery-2.webp", alt: "Diving with shark" },
        { src: "/yachts/zen-scuba-spa/gallery-3.webp", alt: "On deck" },
        { src: "/yachts/zen-scuba-spa/gallery-4.webp", alt: "Lounge area" },
        { src: "/yachts/zen-scuba-spa/gallery-5.webp", alt: "Yoga deck" },
      ],
    },
  },
];

/** Quick lookup by slug */
export const yachtBySlug = Object.fromEntries(
  yachts.map((y) => [y.slug, y])
) as Record<string, Yacht>;
