"use client";

import type Lenis from "lenis";

/**
 * A handle on the single Lenis instance created by <SmoothScroll />.
 *
 * Anything that needs to take the page's scroll away from the visitor — the
 * trip sheet, say — has to talk to Lenis rather than to `overflow: hidden`,
 * because Lenis owns the wheel events. Panels that should still scroll while
 * the page is locked carry `data-lenis-prevent`.
 */
let instance: Lenis | null = null;

export const setLenis = (l: Lenis | null) => {
  instance = l;
};

export const getLenis = () => instance;

/** Freeze the page. Falls back to nothing when Lenis is off (reduced motion). */
export const lockScroll = () => {
  instance?.stop();
  document.documentElement.classList.add("is-scroll-locked");
};

export const unlockScroll = () => {
  instance?.start();
  document.documentElement.classList.remove("is-scroll-locked");
};

/** Smooth-scroll to an element, honouring Lenis when it is running. */
export const scrollToEl = (el: Element | null, offset = -90) => {
  if (!el) return;
  if (instance) {
    instance.scrollTo(el as HTMLElement, { offset, duration: 1.1 });
    return;
  }
  const top = el.getBoundingClientRect().top + window.scrollY + offset;
  window.scrollTo({ top, behavior: "smooth" });
};
