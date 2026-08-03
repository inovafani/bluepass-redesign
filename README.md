# Bluepass — Website Redesign

Next.js (App Router) implementation of `Bluepass Website Redesign.dc.html` from the
Claude Design project, built against the **Bluepass Design System**
(`bluepass-design-system-12358043-6d5c-4675-9247-b4665d96e37a`), with GSAP motion.

```bash
npm install
npm run dev     # http://localhost:3000
npm run build
```

## Structure

| Path | What's in it |
| --- | --- |
| [app/tokens.css](app/tokens.css) | The design system's tokens, ported verbatim (colors, typography, spacing, radius, shadow) plus the `.ds-*` type classes |
| [app/globals.css](app/globals.css) | Layout, responsive rules, and the CSS side of the motion primitives |
| [lib/data.ts](lib/data.ts) | All copy and image seeds, lifted from the design's `renderVals()` |
| [lib/gsap.ts](lib/gsap.ts) | Plugin registration + the two house eases (`bp-out`, `bp-inOut`) |
| [components/](components/) | One file per section, plus `ui/` primitives |

## Design-system fidelity

- Token values are unchanged. The only rewiring is the font stack: `--font-display`
  and `--font-body` are fed by `next/font` (Geist + Inter) instead of the CDN
  `@import`s, which keeps the DS readme's GT Walsheim → Geist substitution intact
  while removing render-blocking requests.
- `Button` reproduces the DS component's three variants, geometry and its
  scale-0.96 press signature.
- Display sizes are clamped for small screens; the token value is the 1440px maximum
  and is never exceeded.
- Photography is `picsum.photos` at the seeds the design specifies — swap
  `lib/data.ts` for real assets.

## Motion

Long, weighted, single-direction. No bounce outside two deliberate uses
(button press-release, the "5% built in" chip). Everything is scoped with
`useGSAP` so it tears down cleanly, and every animation has a rest state that
renders identically under `prefers-reduced-motion: reduce` — which also disables
Lenis and the grain loop.

| Where | Motion |
| --- | --- |
| Global | Lenis smooth scroll driven off the GSAP ticker so scrubs stay frame-locked; drifting film grain |
| Nav | Fixed and fully transparent over the hero — no bar, no reserved space — then materialises a blurred surface once past it; plus logo wave line-draw, hide-down/reveal-up, pill indicator that tracks hover, clip-path mobile overlay |
| Hero | Photo settles out of over-scale, headline lines rise from clip masks, staggered copy, looping scroll cue, content lifts and dissolves on scrub |
| Why | Cards deal in with an x-axis tilt, icon paths draw themselves, hover lifts a step up the surface ramp |
| Explore | Frames unmask upward while photos settle out of over-scale; alternating column drift (five-across only); hover push-in |
| Conservation | Fare card counters count up, chip pops, rows slide in as their hairline draws across |
| Partners | Slot-based carousel — one tween of x/scale/opacity/blur per card, autoplay with hover pause, drag/swipe, arrows, morphing dots. Slot pitch is derived from card width + scale + gutter so neighbours sit apart rather than overlapping |
| Close | Footer columns stagger, wordmark letters rise from clip masks and its tracking tightens on scrub |
| Ask Kai | Delayed overshoot entrance, pulsing presence dot, hover tilt |
