"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);

  // Poster-grade motion: long, weighted, never springy. Registering the house
  // eases here keeps every section reading as one system.
  gsap.registerEase("bp-out", (p) => 1 - Math.pow(1 - p, 4));
  gsap.registerEase("bp-inOut", (p) =>
    p < 0.5 ? 8 * p * p * p * p : 1 - Math.pow(-2 * p + 2, 4) / 2,
  );

  gsap.defaults({ ease: "bp-out", duration: 1 });
  ScrollTrigger.config({ ignoreMobileResize: true });
}

/** True when the visitor has asked the OS for less motion. */
export const reduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export { gsap, ScrollTrigger, useGSAP };
