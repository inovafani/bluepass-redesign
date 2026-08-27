"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { gsap, useGSAP, reduced } from "@/lib/gsap";
import Field from "@/components/auth/Field";
import Notice from "@/components/auth/Notice";
import Button from "@/components/ui/Button";

type Role = "OPERATOR" | "PARTNER" | "TRAVELLER";

const ROLES: { value: Role; label: string }[] = [
  { value: "TRAVELLER", label: "Traveller" },
  { value: "OPERATOR", label: "Operator" },
  { value: "PARTNER", label: "Partner" },
];

/**
 * What the Trips page (app/page.tsx, the site root) renders instead of real listings while
 * `WAITLIST_POPUP_ENABLED` is on (Tony, 2026-08-27: trip listings should be genuinely unreachable,
 * not blurred behind a dismissible popup someone could still inspect around). This is why the gate
 * lives in app/page.tsx as an early return before `fetchSyncedTrips()` runs, not as a client-side
 * overlay - the real trip data never leaves the server when this is showing.
 *
 * Nav stays visible above this (app/layout.tsx is untouched), so Explore/Conservation/Partners
 * remain reachable - only the Trips page itself is gated.
 */
export default function WaitlistGate() {
  const cardRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("TRAVELLER");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useGSAP(
    () => {
      if (reduced()) return;
      gsap.from(cardRef.current, { opacity: 0, y: 24, duration: 0.8, ease: "bp-out" });
    },
    { scope: cardRef },
  );

  const onSubmit = async () => {
    setError(null);
    setBusy(true);

    let res: Response;
    try {
      res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), name: name.trim() || undefined, role }),
      });
    } catch {
      setBusy(false);
      setError("Can’t reach Bluepass right now. Check your connection.");
      return;
    }

    setBusy(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(typeof data?.error === "string" ? data.error : "Something went wrong. Please try again.");
      return;
    }

    setDone(true);
  };

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  return (
    <section className="wlgate">
      {/* A blurred wash of the same imagery, not a literal blurred copy of real trip content
          (there is none to blur - see the module comment) - it's what stands in for "there's a
          page behind this, coming soon" now that the gate is real page content, not a modal
          floating over something. */}
      <span className="wlgate__backdrop" aria-hidden />
      <div ref={cardRef} className="wlgate__card">
        <span className="wlgate__image">
          <Image src="/great-barrier.jpg" alt="" fill sizes="700px" quality={90} style={{ objectFit: "cover" }} />
          <span className="wlgate__image-scrim" aria-hidden />
        </span>

        <div className="wlgate__panel">
          {done ? (
            <div className="wlgate__done">
              <span className="wlgate__done-glyph" aria-hidden>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </span>
              <h1 className="ds-headline wlgate__title">You&rsquo;re on the list</h1>
              <p className="ds-body-sm wlgate__body">We&rsquo;ll email you the moment trips are live.</p>
            </div>
          ) : (
            <>
              <h1 className="ds-display-md wlgate__title">Bluepass is coming soon.</h1>
              <p className="ds-body-sm wlgate__body">
                We&rsquo;re finishing our first wave of operators, so trip listings aren&rsquo;t live
                just yet. Leave your email and tell us how you&rsquo;d like to be involved. We&rsquo;ll
                reach out the moment we launch.
              </p>

              {error ? <Notice tone="error">{error}</Notice> : null}

              <div className="wlgate__roles" role="radiogroup" aria-label="I'm joining as">
                {ROLES.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    role="radio"
                    aria-checked={role === r.value}
                    className={`wlgate__role ${role === r.value ? "is-active" : ""}`}
                    onClick={() => setRole(r.value)}
                    disabled={busy}
                  >
                    {r.label}
                  </button>
                ))}
              </div>

              <Field
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="you@example.com"
                autoComplete="email"
                required
                disabled={busy}
              />
              <Field
                label="Name"
                value={name}
                onChange={setName}
                placeholder="Optional"
                autoComplete="name"
                disabled={busy}
              />

              <div className="wlgate__actions">
                <Button variant="primary" large magnetic={false} onClick={onSubmit} disabled={busy || !validEmail}>
                  {busy ? "Joining…" : "Join the waitlist"}
                </Button>
              </div>

              <p className="ds-micro wlgate__terms">No spam, just one email when we launch.</p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
