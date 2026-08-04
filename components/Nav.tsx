"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { gsap, ScrollTrigger, useGSAP, reduced } from "@/lib/gsap";
import { navLinks } from "@/lib/data";
import Button from "./ui/Button";
import AccountMenu from "./auth/AccountMenu";
import { useSession } from "./auth/SessionProvider";

export default function Nav() {
  const ref = useRef<HTMLElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { traveller, signOut } = useSession();

  /* The auth pages carry their own brand mark inside the poster panel and have
     no use for a marketing nav — leaving it up stacked two Bluepass marks in
     the same corner and offered "Join Bluepass" to someone already on
     /register. */
  const bare = ["/login", "/register", "/reset-password"].includes(pathname);
  const [hover, setHover] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  /* Section links (/#conservation) only count as current while on home. */
  const active = Math.max(
    0,
    navLinks.findIndex((l) => l.href === pathname),
  );

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      const brand = el.querySelector(".nav__brand");
      const pill = pillRef.current;
      const actions = el.querySelector(".nav__actions");
      const wave = el.querySelector<SVGPathElement>(".nav__wave");

      /* ---- entrance -------------------------------------------------- */
      if (!reduced()) {
        gsap
          .timeline({ delay: 0.15 })
          .from(el, { yPercent: -100, duration: 1.1, ease: "bp-out" })
          .from(brand, { opacity: 0, x: -14, duration: 0.8 }, "-=0.6")
          .from(
            pill ? Array.from(pill.querySelectorAll("a")) : [],
            { opacity: 0, y: 10, duration: 0.6, stagger: 0.05 },
            "-=0.55",
          )
          .from(actions, { opacity: 0, x: 14, duration: 0.7 }, "-=0.6");

        if (wave) {
          const len = wave.getTotalLength();
          gsap.fromTo(
            wave,
            { strokeDasharray: len, strokeDashoffset: len },
            { strokeDashoffset: 0, duration: 1.4, ease: "bp-inOut", delay: 0.5 },
          );
        }
      }

      /* ---- transparent over the hero, condensed once past it ---------
         The surface is its own element: the hide/reveal tween below owns the
         nav's transform, and letting both tweens target the same element is
         what previously left the bar stuck opaque after scrolling back up. */
      const surface = el.querySelector(".nav__surface");
      const condense = gsap
        .timeline({ paused: true })
        .to(
          surface,
          {
            backgroundColor: "rgba(10,10,9,0.72)",
            backdropFilter: "blur(18px)",
            borderBottomColor: "rgba(255,255,255,0.12)",
            duration: 0.5,
            ease: "power2.out",
          },
          0,
        )
        .to(el, { height: 64, duration: 0.5, ease: "power2.out" }, 0)
        .to(pill, { backgroundColor: "rgba(26,26,24,0.92)", duration: 0.5 }, 0);

      ScrollTrigger.create({
        start: 40,
        end: "max",
        onEnter: () => condense.play(),
        onLeaveBack: () => condense.reverse(),
      });

      /* ---- hide going down, reveal going up -------------------------- */
      if (!reduced()) {
        let last = 0;
        ScrollTrigger.create({
          start: 240,
          end: "max",
          onUpdate: (self) => {
            const y = self.scroll();
            if (Math.abs(y - last) < 12) return;
            const down = y > last;
            last = y;
            if (open) return;
            gsap.to(el, {
              yPercent: down ? -110 : 0,
              duration: 0.55,
              ease: "power3.out",
              overwrite: "auto",
            });
          },
          onLeaveBack: () => gsap.to(el, { yPercent: 0, duration: 0.4, overwrite: "auto" }),
        });
      }
    },
    { scope: ref },
  );

  /* ---- sliding pill indicator ---------------------------------------- */
  const moveIndicator = (index: number) => {
    const pill = pillRef.current;
    const ind = indicatorRef.current;
    if (!pill || !ind) return;
    const target = pill.querySelectorAll("a")[index] as HTMLElement | undefined;
    if (!target) return;
    gsap.to(ind, {
      x: target.offsetLeft - 5,
      width: target.offsetWidth,
      duration: reduced() ? 0 : 0.55,
      ease: "bp-out",
      overwrite: true,
    });
  };

  useGSAP(
    () => {
      const run = () => moveIndicator(active);
      run();
      document.fonts?.ready.then(run);
      window.addEventListener("resize", run);
      return () => window.removeEventListener("resize", run);
    },
    { dependencies: [active] },
  );

  /* ---- mobile overlay menu ------------------------------------------- */
  useGSAP(
    () => {
      const panel = menuRef.current;
      if (!panel) return;
      const items = panel.querySelectorAll(".nav__menu-item");

      if (open) {
        gsap.set(panel, { display: "flex" });
        gsap
          .timeline()
          .fromTo(
            panel,
            { clipPath: "inset(0 0 100% 0)" },
            { clipPath: "inset(0 0 0% 0)", duration: 0.7, ease: "bp-inOut" },
          )
          .fromTo(
            items,
            { yPercent: 120, opacity: 0 },
            { yPercent: 0, opacity: 1, duration: 0.9, stagger: 0.06 },
            "-=0.35",
          );
      } else {
        gsap.to(panel, {
          clipPath: "inset(0 0 100% 0)",
          duration: 0.5,
          ease: "bp-inOut",
          onComplete: () => gsap.set(panel, { display: "none" }),
        });
      }
    },
    { dependencies: [open] },
  );

  const linkColor = (i: number) =>
    (hover ?? active) === i ? "var(--color-on-primary)" : "var(--color-ink-muted)";

  if (bare) return null;

  return (
    <>
      <nav
        ref={ref}
        className="nav"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 60,
          background: "transparent",
          height: 76,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 var(--page-gutter)",
          willChange: "transform",
        }}
      >
        <span
          className="nav__surface"
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(10,10,9,0)",
            borderBottom: "1px solid rgba(255,255,255,0)",
            pointerEvents: "none",
          }}
        />

        <Link
          href="/"
          className="nav__brand"
          style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0, textDecoration: "none" }}
        >
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "var(--color-ink)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flex: "none",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                className="nav__wave"
                d="M3 16c2-3 4-3 6 0s4 3 6 0 4-3 6 0"
                stroke="#0a0a09"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span className="ds-headline" style={{ fontSize: 19, letterSpacing: -0.4, whiteSpace: "nowrap" }}>
            Bluepass
          </span>
        </Link>

        <div
          ref={pillRef}
          className="nav__pill"
          onPointerLeave={() => {
            setHover(null);
            moveIndicator(active);
          }}
          style={{
            position: "relative",
            alignItems: "center",
            gap: 2,
            background: "rgba(26,26,24,0.42)",
            backdropFilter: "blur(14px)",
            padding: 5,
            borderRadius: "var(--radius-pill)",
            minWidth: 0,
          }}
        >
          <span
            ref={indicatorRef}
            aria-hidden
            style={{
              position: "absolute",
              left: 5,
              top: 5,
              bottom: 5,
              width: 0,
              borderRadius: "var(--radius-pill)",
              background: "var(--color-ink)",
              pointerEvents: "none",
            }}
          />
          {navLinks.map((link, i) => (
            <Link
              key={link.href}
              href={link.href}
              onPointerEnter={() => {
                setHover(i);
                moveIndicator(i);
              }}
              style={{
                position: "relative",
                padding: "8px 14px",
                borderRadius: "var(--radius-pill)",
                color: linkColor(i),
                fontFamily: "var(--font-body)",
                fontSize: "var(--type-body-sm-size)",
                fontWeight: (hover ?? active) === i ? 600 : 500,
                whiteSpace: "nowrap",
                flex: "none",
                textDecoration: "none",
                transition: "color .3s ease",
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div
          className="nav__actions"
          style={{ display: "flex", alignItems: "center", gap: 10, whiteSpace: "nowrap", flexShrink: 0 }}
        >
          {/* Signed in, "Join Bluepass" has nothing left to offer — the account
              menu takes over that slot. */}
          {traveller ? null : (
            <Button variant="primary" onClick={() => router.push("/register")}>
              Join Bluepass →
            </Button>
          )}
          <AccountMenu />
          <button
            type="button"
            className="nav__burger"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <i style={{ transform: open ? "translateY(3px) rotate(45deg)" : "none" }} />
            <i style={{ transform: open ? "translateY(-3px) rotate(-45deg)" : "none" }} />
          </button>
        </div>
      </nav>

      <div ref={menuRef} className="nav__menu" style={{ display: "none" }}>
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="nav__menu-item"
            onClick={() => setOpen(false)}
          >
            {link.label}
          </Link>
        ))}

        {/* Below 560px the avatar is hidden, so the burger menu is the only way
            to reach the account at all. */}
        <div className="nav__menu-acct">
          {traveller ? (
            <>
              <span className="ds-micro nav__menu-who">
                Signed in as {traveller.name ?? traveller.email}
              </span>
              <button
                type="button"
                className="nav__menu-link ds-body"
                onClick={async () => {
                  await signOut();
                  setOpen(false);
                  router.push("/");
                }}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="nav__menu-link ds-body" onClick={() => setOpen(false)}>
                Sign in
              </Link>
              <Link
                href="/register"
                className="nav__menu-link nav__menu-link--go ds-body"
                onClick={() => setOpen(false)}
              >
                Join Bluepass →
              </Link>
            </>
          )}
        </div>
      </div>
    </>
  );
}
