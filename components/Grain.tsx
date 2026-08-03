"use client";

import { useRef } from "react";
import { gsap, useGSAP, reduced } from "@/lib/gsap";

/**
 * A whisper of film grain over the whole page. It drifts on a short loop so it
 * never freezes into a visible static texture on a still screen.
 */
export default function Grain() {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (reduced()) return;
      gsap.to(ref.current, {
        keyframes: [
          { x: "-2%", y: "-3%" },
          { x: "1%", y: "2%" },
          { x: "3%", y: "-1%" },
          { x: "-1%", y: "3%" },
          { x: "0%", y: "0%" },
        ],
        duration: 1.6,
        ease: "steps(1)",
        repeat: -1,
      });
    },
    { scope: ref },
  );

  return <div ref={ref} className="grain" aria-hidden />;
}
