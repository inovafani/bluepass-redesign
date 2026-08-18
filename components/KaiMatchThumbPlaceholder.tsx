/**
 * What sits in a product card's thumbnail slot when there is no photo to show.
 *
 * AU/Boattime cards come from Rezdy, which exposes no image source at all, so those cards shipped
 * with an empty slot rather than a broken one. An empty slot reads as a layout fault, though, so
 * this fills it while a real photo pipeline does not exist.
 *
 * Deliberately not a stock photo, local or remote: it must not be mistaken for the operator's own
 * product. A muted mark on a flat fill reads as "no picture yet", which is the truth, and it means a
 * real `heroImageUrl` can replace it later with nothing to undo.
 *
 * The wave is the same motif the conservation glyph in `AccountMenu` uses — one shape vocabulary
 * across the app rather than a new icon invented for this slot.
 */
export default function KaiMatchThumbPlaceholder() {
  return (
    <span className="kmatch__img kmatch__img--empty" aria-hidden>
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 13c2-2.5 4-2.5 6 0s4 2.5 6 0 4-2.5 6 0" />
        <path d="M3 18c2-2.5 4-2.5 6 0s4 2.5 6 0 4-2.5 6 0" />
      </svg>
    </span>
  );
}
