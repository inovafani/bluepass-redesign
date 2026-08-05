"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import { gsap, ScrollTrigger, reduced } from "@/lib/gsap";
import { setLenis } from "@/lib/lenis";

/* useLayoutEffect on the client, useEffect on the server render — same guard
   @gsap/react uses, so React doesn't warn during SSR. */
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

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

    /* Every route change lands at the top anyway (see below), so let the browser
       hand a reload back at 0 instead of restoring a deep scroll position after
       hydration — a page that mounts mid-document builds its ScrollTriggers
       against a scroll the new layout knows nothing about. */
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";

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
     page's triggers measure themselves against the real layout.

     This has to be a *layout* effect, and this component has to sit above
     {children} in the root layout, because React fires layout effects
     child-first and every section's useGSAP is itself a layout effect. As a
     passive effect the reset landed after the incoming page had already built
     its ScrollTriggers — at the *outgoing* page's scroll depth. Everything the
     new page puts above that point is then instantly past its end, so those
     `once: true` triggers fire and kill themselves while GSAP is still walking
     its trigger array inside refresh(); the array shrinks under the loop and
     the next read comes back undefined ("Cannot read properties of undefined
     (reading 'end')"). Clicking into /conservation from mid-page on the home
     page was exactly that. Resetting first means the page always measures
     itself from the top, the way a fresh load does. */
  useIsoLayoutEffect(() => {
    lenisRef.current?.scrollTo(0, { immediate: true });
    window.scrollTo(0, 0);
    /* The triggers created moments from now read this cached value, not the DOM. */
    ScrollTrigger.update();

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
