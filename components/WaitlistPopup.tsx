"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { gsap, useGSAP, reduced } from "@/lib/gsap";
import { lockScroll, unlockScroll } from "@/lib/lenis";
import { isConsolePathname } from "@/lib/services/pathname";
import Field from "@/components/auth/Field";
import Notice from "@/components/auth/Notice";
import Button from "@/components/ui/Button";

type Role = "OPERATOR" | "PARTNER" | "TRAVELLER";

const ROLES: { value: Role; label: string }[] = [
  { value: "TRAVELLER", label: "Traveller" },
  { value: "OPERATOR", label: "Operator" },
  { value: "PARTNER", label: "Partner" },
];

/* Marketing pages only. Consoles (admin/operator/creator) are for people already in the
   product, and the auth pages are a task someone is mid-way through - a "still building this"
   interstitial in front of either would be noise, not an invitation. */
const EXTRA_EXCLUDED_PATHS = [
  "/account",
  "/login",
  "/register",
  "/reset-password",
];

function isExcludedPathname(pathname: string) {
  return (
    isConsolePathname(pathname) ||
    EXTRA_EXCLUDED_PATHS.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`),
    )
  );
}

/**
 * The "coming soon" interstitial (Tony, 2026-08-27 WhatsApp brief): a lightbox in front of a
 * blurred site, not a gate - closing it (or just submitting) lets the visitor straight through to
 * the real site underneath. Shows on every fresh visit rather than once-and-remembered (Tony:
 * "harusnya sih setiap buka biar jelas ya") - deliberately no localStorage/cookie check, so a
 * reload always brings it back. Toggled off entirely by unsetting `WAITLIST_POPUP_ENABLED` once
 * the platform is ready to launch properly - see app/layout.tsx.
 */
export default function WaitlistPopup() {
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef(false);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(true);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("TRAVELLER");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  const excluded = isExcludedPathname(pathname);

  useEffect(() => {
    if (excluded || !open) return;
    closingRef.current = false;
    lockScroll();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
      unlockScroll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [excluded, open]);

  useGSAP(
    () => {
      if (!mounted || excluded || !open || reduced()) return;
      const el = rootRef.current;
      if (!el) return;
      gsap.set(el.querySelector(".wlpop__backdrop"), { opacity: 0 });
      gsap.set(el.querySelector(".wlpop__card"), {
        opacity: 0,
        y: 18,
        scale: 0.97,
      });
      gsap
        .timeline()
        .to(el.querySelector(".wlpop__backdrop"), {
          opacity: 1,
          duration: 0.45,
        })
        .to(
          el.querySelector(".wlpop__card"),
          { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: "bp-out" },
          0.08,
        );
    },
    // `mounted` has to be a dependency, not just a render gate: the portal (and rootRef's node)
    // only exist once `mounted` flips true, and that flip happens on its own effect, one render
    // after this hook first runs - without it here, useGSAP's effect fires once while `el` is
    // still null and never re-fires, so the entrance never plays and the popup just appears in
    // its resting state.
    { dependencies: [mounted, excluded, open], scope: rootRef },
  );

  const close = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    const el = rootRef.current;
    if (!el || reduced()) {
      setOpen(false);
      return;
    }
    gsap
      .timeline({ onComplete: () => setOpen(false) })
      .to(el.querySelector(".wlpop__card"), {
        opacity: 0,
        y: 14,
        scale: 0.97,
        duration: 0.3,
        ease: "power2.in",
      })
      .to(
        el.querySelector(".wlpop__backdrop"),
        { opacity: 0, duration: 0.28 },
        0.04,
      );
  };

  const onSubmit = async () => {
    setError(null);
    setBusy(true);

    let res: Response;
    try {
      res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim() || undefined,
          role,
        }),
      });
    } catch {
      setBusy(false);
      setError("Can’t reach Bluepass right now. Check your connection.");
      return;
    }

    setBusy(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(
        typeof data?.error === "string"
          ? data.error
          : "Something went wrong. Please try again.",
      );
      return;
    }

    setDone(true);
  };

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  if (!mounted || excluded || !open) return null;

  return createPortal(
    <div
      ref={rootRef}
      className="wlpop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wlpop-title"
    >
      <button
        type="button"
        className="wlpop__backdrop"
        onClick={close}
        aria-label="Close"
      />
      <div className="wlpop__card" data-lenis-prevent>
        {/* Same split-poster shape as AuthShell (login/register): photography on one side,
            the form on the other, so this reads as a Bluepass moment rather than a bare utility
            dialog. Hidden under 720px - see .wlpop__image's media query - a modal has far less
            height budget than a full page, so at phone widths the photo would just squeeze the
            form instead of adding anything. */}
        <span className="wlpop__image">
          <Image
            src="/great-barrier.jpg"
            alt=""
            fill
            // The box is only 300px wide but can run ~700px tall, and a landscape source
            // cropped with object-fit: cover scales up to cover the taller dimension, not the
            // narrower one - a `sizes` hint matching the box's own width told Next.js it could
            // serve a much smaller, visibly soft variant than what's actually on screen.
            sizes="700px"
            quality={90}
            style={{ objectFit: "cover" }}
          />
          <span className="wlpop__image-scrim" aria-hidden />
        </span>

        <div className="wlpop__panel">
          <button
            type="button"
            className="wlpop__close"
            onClick={close}
            aria-label="Close"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              <path d="M5 5l14 14M19 5L5 19" />
            </svg>
          </button>

          {done ? (
            <div className="wlpop__done">
              <span className="wlpop__done-glyph" aria-hidden>
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </span>
              <h2 className="ds-headline wlpop__title">
                You&rsquo;re on the list
              </h2>
              <p className="ds-body-sm wlpop__body">
                We&rsquo;ll email you the moment Bluepass is ready.
              </p>
              <Button variant="secondary" magnetic={false} onClick={close}>
                Continue to the site
              </Button>
            </div>
          ) : (
            <>
              <h2
                id="wlpop-title"
                className="ds-display-md wlpop__title wlpop__title--lead"
              >
                Bluepass is coming soon.
              </h2>
              <p className="ds-body-sm wlpop__body">
                We&rsquo;re finishing our first wave of operators. Leave your
                email and tell us how you&rsquo;d like to be involved.
                We&rsquo;ll reach out the moment we launch.
              </p>

              {error ? <Notice tone="error">{error}</Notice> : null}

              <div
                className="wlpop__roles"
                role="radiogroup"
                aria-label="I'm joining as"
              >
                {ROLES.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    role="radio"
                    aria-checked={role === r.value}
                    className={`wlpop__role ${role === r.value ? "is-active" : ""}`}
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

              <div className="wlpop__actions">
                <Button
                  variant="primary"
                  large
                  magnetic={false}
                  onClick={onSubmit}
                  disabled={busy || !validEmail}
                >
                  {busy ? "Joining…" : "Join the waitlist"}
                </Button>
              </div>

              <p className="ds-micro wlpop__terms">
                No spam, just one email when we launch.
              </p>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
