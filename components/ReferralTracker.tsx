"use client";

import { useEffect } from "react";

/**
 * Mounted once in the root layout. Reads `?ref=` off the raw URL (not `useSearchParams()`, which
 * would force a Suspense boundary around the whole layout for a one-shot effect) and reports the
 * click to /api/referrals/track, which resolves the code and sets the attribution cookie. Runs
 * once per session load, not on every client-side navigation - a shared link's `ref` param won't
 * still be in the URL after the visitor clicks elsewhere on the site anyway.
 */
export default function ReferralTracker() {
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("ref");
    if (!code) return;

    fetch("/api/referrals/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, landingPath: window.location.pathname }),
      credentials: "include",
    }).catch(() => {
      // Attribution is best-effort - a failed tracking call must never block the page.
    });
  }, []);

  return null;
}
