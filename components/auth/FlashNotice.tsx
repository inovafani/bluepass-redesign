"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, useGSAP, reduced } from "@/lib/gsap";
import { useSession } from "./SessionProvider";

/**
 * Confirms flows that finish by redirecting somewhere else in the app.
 *
 * `/api/auth/verify-email` signs the visitor in and drops them on
 * `/discover?emailVerified=1` — a page that knows nothing about auth. Rather
 * than teaching the discover page about it, this reads the flag globally and
 * clears it from the URL, so the redirect target stays untouched.
 *
 * Reads `window.location.search` in an effect instead of `useSearchParams()`
 * so the root layout does not need a Suspense boundary.
 */
const MESSAGES: Record<string, string> = {
  emailVerified: "Email verified — you’re signed in.",
  passwordReset: "Password updated. You can sign in with it now.",
};

export default function FlashNotice() {
  const ref = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const { refresh } = useSession();

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const key = Object.keys(MESSAGES).find((k) => q.get(k) === "1");
    if (!key) return;

    setMessage(MESSAGES[key]);
    /* The verify-email redirect set a session cookie mid-navigation, so the
       nav is still holding the signed-out result from its first fetch. */
    void refresh();

    q.delete(key);
    const qs = q.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);

    const t = window.setTimeout(() => setMessage(null), 7000);
    return () => window.clearTimeout(t);
  }, [refresh]);

  useGSAP(
    () => {
      if (!message || reduced()) return;
      gsap.fromTo(
        ref.current,
        { opacity: 0, y: -18 },
        { opacity: 1, y: 0, duration: 0.7, ease: "bp-out" },
      );
    },
    { dependencies: [message] },
  );

  if (!message) return null;

  return (
    <div ref={ref} className="aflash" role="status">
      <span className="aflash__dot" aria-hidden />
      <span className="ds-body-sm aflash__text">{message}</span>
      <button type="button" className="aflash__close" aria-label="Dismiss" onClick={() => setMessage(null)}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  );
}
