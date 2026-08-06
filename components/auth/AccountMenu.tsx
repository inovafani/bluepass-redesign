"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { gsap, useGSAP, reduced } from "@/lib/gsap";
import { initialsOf } from "@/lib/auth-client";
import { useSession } from "./SessionProvider";

/**
 * The nav avatar, made real.
 *
 * The 38px glass circle keeps the exact geometry it had as a decorative
 * `<span>` — this adds behaviour to that shape, it does not restyle it. Signed
 * out it walks to /login; signed in it opens a panel that drops out of the
 * circle itself, so the menu reads as the avatar unfolding rather than a
 * detached dropdown.
 */
export default function AccountMenu() {
  const { traveller, loading, signOut } = useSession();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  /* Close on outside click and on Escape — a nav-level panel that traps neither
     focus nor clicks would sit over the page's own controls. */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useGSAP(
    () => {
      const panel = ref.current?.querySelector(".acct__panel");
      if (!panel || !open || reduced()) return;
      gsap
        .timeline()
        .fromTo(
          panel,
          { opacity: 0, y: -12, scaleY: 0.9, transformOrigin: "top right" },
          { opacity: 1, y: 0, scaleY: 1, duration: 0.45, ease: "bp-out" },
        )
        .fromTo(
          panel.querySelectorAll(".acct__row"),
          { opacity: 0, y: -8 },
          { opacity: 1, y: 0, duration: 0.4, stagger: 0.05 },
          0.1,
        );
    },
    { scope: ref, dependencies: [open] },
  );

  const onSignOut = async () => {
    setSigningOut(true);
    await signOut();
    setSigningOut(false);
    setOpen(false);
    router.push("/");
    router.refresh();
  };

  /* Until /api/auth/me settles, render the resting circle. Guessing "signed
     out" here would flash a sign-in prompt at people who are signed in. */
  if (loading) {
    return (
      <span className="nav__avatar acct__circle" aria-hidden>
        <span className="acct__pending" />
      </span>
    );
  }

  if (!traveller) {
    return (
      <Link
        href="/login"
        className="nav__avatar acct__circle acct__circle--link"
        aria-label="Sign in to Bluepass"
        title="Sign in"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink)" strokeWidth="1.8">
          <circle cx="12" cy="8" r="3.2" />
          <path d="M5 20c1.5-4 4.5-6 7-6s5.5 2 7 6" strokeLinecap="round" />
        </svg>
      </Link>
    );
  }

  const roleLabel = traveller.operatorProfile
    ? (traveller.operatorProfile.companyName ?? "Operator")
    : traveller.creatorProfile
      ? `@${traveller.creatorProfile.handle ?? "creator"}`
      : "Traveller";

  return (
    <div ref={ref} className="acct">
      <button
        type="button"
        className="nav__avatar acct__circle acct__circle--on"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${traveller.name ?? traveller.email}`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="acct__initials">{initialsOf(traveller)}</span>
      </button>

      {open ? (
        <div className="acct__panel" role="menu">
          <div className="acct__head">
            <span className="acct__head-initials" aria-hidden>
              {initialsOf(traveller)}
            </span>
            <span className="acct__head-text">
              <span className="ds-body-sm acct__name">{traveller.name ?? "Traveller"}</span>
              <span className="ds-micro acct__email">{traveller.email}</span>
            </span>
          </div>

          <span className="acct__badge ds-micro">{roleLabel}</span>

          <div className="acct__rows">
            <Link href="/" className="acct__row ds-body-sm" role="menuitem" onClick={() => setOpen(false)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M15 9l-4.2 1.8L9 15l4.2-1.8z" />
              </svg>
              Discover trips
            </Link>
            <Link href="/conservation" className="acct__row ds-body-sm" role="menuitem" onClick={() => setOpen(false)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 14c2-2.5 4-2.5 6 0s4 2.5 6 0 4-2.5 6 0" />
                <path d="M12 4c2 2.5 2 5 0 7-2-2-2-4.5 0-7z" />
              </svg>
              Where the 5% goes
            </Link>
            <button
              type="button"
              className="acct__row acct__row--out ds-body-sm"
              role="menuitem"
              onClick={onSignOut}
              disabled={signingOut}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 17l5-5-5-5M20 12H9M12 4H5v16h7" />
              </svg>
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
