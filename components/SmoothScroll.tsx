"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import { gsap, ScrollTrigger, reduced } from "@/lib/gsap";
import { setLenis } from "@/lib/lenis";

/**
 * Drives the page off Lenis and hands ScrollTrigger the same clock, so scrubbed
 * timelines stay locked to the eased scroll position instead of lagging a frame
 * behind it. Skipped entirely under prefers-reduced-motion.
 */
export default function SmoothScroll() {
  const lenisRef = useRef<Lenis | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (reduced()) return;

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      wheelMultiplier: 1,
      touchMultiplier: 1.6,
    });
    lenisRef.current = lenis;
    setLenis(lenis);

    lenis.on("scroll", ScrollTrigger.update);

    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
      lenisRef.current = null;
      setLenis(null);
    };
  }, []);

  /* A client-side route change swaps the whole page under a scroll position
     Lenis and ScrollTrigger still believe in. Reset both, then let the new
     page's triggers measure themselves against the real layout. */
  useEffect(() => {
    lenisRef.current?.scrollTo(0, { immediate: true });
    window.scrollTo(0, 0);

    /* Refresh once the layout has settled, then again after fonts and images
       land — hero photos change page height enough to move every trigger. */
    const refresh = () => ScrollTrigger.refresh();
    const ids = [120, 700].map((d) => window.setTimeout(refresh, d));
    document.fonts?.ready.then(refresh);
    window.addEventListener("load", refresh);

    return () => {
      ids.forEach(window.clearTimeout);
      window.removeEventListener("load", refresh);
    };
  }, [pathname]);

  return null;
}
