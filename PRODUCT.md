# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The operator page (`/operators/<slug>`) is an operator's own page on Bluepass: a profile with their trips. It is not the claim page. Claiming has its own flow, which this page only links to: `/operator/claim/start/<slug>` (a page of its own, "Claim your page") and `/operator/claim/verify` (which shows the prepared page under a claim bar). Corrected by the owner on 2026-11-12 ("halaman claim ada sendiri"); an earlier record here wrongly made claiming this page's purpose.

Who looks at it:

1. **The traveller.** Someone deciding which trip and which operator to trust, from Discover or a shared link. Their job: understand who this is and what they run, then enquire or book.
2. **The operator.** A small marine business (dive boats, sailing and fishing charters, liveaboards, surf camps). Bluepass builds their page from what they publish on their own website and emails them two separate links: this page ("we've built a page for you") and the claim page. They open this one to see their business represented, correctly and respectfully.

## Product Purpose

Bluepass is a marine booking marketplace for surf, sail and dive trips in Australia and Indonesia (a Barbados pilot exists), launching January 2027. It lists vetted operators and lets travellers book through a conversation with Kai, Bluepass's assistant, or, until a trip is bookable on Bluepass, send them to the operator's own booking page.

The operator page presents one operator and their trips as well as the Discover trip sheet presents one trip. Success: a traveller reaches the operator's enquiry or booking route; an operator who sees it recognises their business and finds the claim link.

## Positioning

Confirmed differentiators, all four to be felt on this page:

- Operator's own price, never a markup.
- A fixed 5% of every booking goes to ocean conservation.
- Operators are vetted, not an open listing.
- Booking by conversation with Kai.

## Operating Context

- Each page is prepared from the operator's own website (one JSON per operator, facts copied with their source page, summaries written fresh), imported as a draft, and checked by a person in the admin queue (`/admin/operator-pages`) before a traveller sees it.
- An unclaimed page is a placeholder: `noindex`, built by Bluepass, not requested by the operator. It must say so plainly. A claimed page is the operator's own.
- Operators are reached by cold email. Outreach is held by default for every imported address until the founder approves each operator.
- Claim flow: separate pages (`/operator/claim/start/<slug>`, then `/operator/claim/verify`). The operator reviews their page as travellers see it, then claims and publishes. The email carries both the page link and the claim link.
- Photos on a prepared page are linked from the operator's own website. Today a traveller sees none of them until the operator has claimed the page and approved them, so every page has to read well with no photos at all.
- The operator's own booking page is the booking route until the operator connects a booking system or Bluepass books natively.

## Capabilities and Constraints

Binding (confirmed by the owner): an unclaimed page always states that the operator has not confirmed it.

In force today through the implementation and the conditions set by the founder's side, not re-confirmed as design constraints in this round: no operator photos in public view before the operator approves them; no prices or availability beyond what the operator's site states (otherwise "On enquiry" / "Price when you book"); the primary booking action goes to the operator's own page until a trip is bookable on Bluepass.

Other facts: unclaimed pages are excluded from search indexing and from the sitemap; Bluepass's own wording never contains an em dash (enforced by the importer); the same components also render the admin preview and the operator's claim review.

## Brand Commitments

- Name: Bluepass. Domain bluepass.co. Logo assets in `public/` (`bluepass-logo-full.png`, `bluepass-logo-transparent.png`). Instagram: @bluepasslive.
- Voice: plain and specific. Bluepass's own words avoid em dashes and avoid promises about price, listings or availability that are not yet true.
- Existing identity: the Bluepass design system and the Discover trip sheet (`tony-design.html`, source of the Discover design). The owner names the Discover trip sheet as the quality bar for this page.

## Evidence on Hand

- 20 prepared Australian operator pages (imported 2026-11-10), each with a summary, 1 to 2 trips, contact details, and the operator's source URLs. Mostly without prices. Only some have photos, linked from their own sites; a few have no photo at all. Most have no logo.
- Real: operator names, locations, contact details, trip names and descriptions from their websites.
- Absent, and must not be fabricated: reviews and ratings, prices, availability, testimonials, certifications, operator-supplied copy, and any claim that the operator has seen or approved the page.

## Product Principles

1. **Show the work already done, honestly.** The page is Bluepass's preparation on the operator's behalf; it says so, and never implies the operator is already a partner.
2. **Say only what the operator has said.** No invented prices, photos, reviews or availability. An empty field is stated as empty, not filled.
3. **The mechanism stays visible without hype.** Own price, no markup, 5% to the ocean, vetted operators, booking by conversation: true statements, plainly placed.
4. **The page must stand without a photo.** It is judged in the state most pages are in.
5. **The operator is the authority, and claiming is its own flow.** This page makes the claim link easy to find and never pretends to be the claim page.
