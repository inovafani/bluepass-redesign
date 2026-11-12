# Surface: operator page (`/operators/<slug>`)

Files: `components/operators/PreparedViews.tsx`, `TripGrid.tsx`, `PhotoGallery.tsx`; styles in `app/rails.css` (`.opp-*`) and `app/theme-light.css`.

## Mode

Persuade, lightly: a traveller decides whether to trust the operator and enquire; an operator recognises their business.

## Decision (2026-11-12): refine, do not redesign

The owner rejected a dark "cinematic" redesign and a claim-page concept. This page keeps its identity:

- Light theme, shared with the booking pages (`app/operators/layout.tsx`). Not the dark Discover world.
- Same structure, same copy, same purpose: a profile page with the operator's trips. Claiming is a separate flow (`/operator/claim/start/<slug>`, `/operator/claim/verify`); this page only links to it.
- The unclaimed note ("Prepared by Bluepass ... hasn't confirmed it yet") stays, always.

## What refinement is allowed to change

Layout fit only: blocks fill their container and proportions hold at every count of trips and photos.

- Summary card: facts share the width evenly with dividers, CTA at the right.
- Trip cards: one trip becomes a wide horizontal card; 2 and 4 trips split evenly.
- Photo grid: 2, 3, 4 photos fill the row; 5 and 9 use the featured layout; no empty cells.

## Must keep working

- No photo at all (most pages today): the page has to stand on type and layout.
- Mobile 390: single column, no horizontal scroll.
- Same components render the admin preview and the claim review.
