"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import ConsoleIcon, { type ConsoleIconName } from "./ConsoleIcon";

export type ConsoleNavItem = {
  href: string;
  label: string;
  icon: ConsoleIconName;
  /** A number waiting behind this item (e.g. approvals), shown as a badge when above zero. */
  count?: number;
  /** Only lights up on this exact page, for an index page whose path prefixes every other one. */
  exact?: boolean;
};

export type ConsoleNavGroup = { label: string; items: ConsoleNavItem[] };

function isActive(item: ConsoleNavItem, pathname: string) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/**
 * The shell every console shares (admin, CRM, operator, partner): a top bar, a side menu card and
 * the page. Groups and items are data, so each console only says what it contains. The most
 * specific matching item is the one lit up.
 *
 * On a phone the side menu is a drawer behind a menu button in the top bar, the way the public site's
 * menu is, instead of a row of pills to scroll sideways. It closes when a page is chosen, on Escape, or
 * when the dimmed page behind it is touched, and the page underneath does not scroll while it is open.
 */
export default function ConsoleShell({
  area,
  groups,
  person,
  role,
  exit = { href: "/", label: "Back to bluepass.co" },
  children,
}: {
  /** What this console is, shown beside the logo: "Admin", "Operator", "Partner", "Outreach CRM". */
  area: string;
  groups: ConsoleNavGroup[];
  person: string;
  role: string;
  exit?: { href: string; label: string };
  children: ReactNode;
}) {
  const pathname = usePathname();
  const active = groups
    .flatMap((group) => group.items)
    .filter((item) => isActive(item, pathname))
    .sort((a, b) => b.href.length - a.href.length)[0];
  const home = groups[0]?.items[0]?.href ?? "/";
  const [open, setOpen] = useState(false);
  const burger = useRef<HTMLButtonElement>(null);

  // Choosing a page closes the drawer.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      burger.current?.focus();
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={`cshell${open ? " is-open" : ""}`}>
      <header className="cshell-top">
        <button
          ref={burger}
          type="button"
          className="cshell-burger"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="cshell-drawer"
          onClick={() => setOpen((value) => !value)}
        >
          <span className="cshell-burger__bars" aria-hidden>
            <i />
            <i />
            <i />
          </span>
        </button>
        <Link href={home} className="cshell-brand">
          <span className="cshell-brand__mark" aria-hidden>
            <Image src="/bluepass-logo-transparent.png" alt="" width={22} height={22} />
          </span>
          <span className="cshell-brand__name">Bluepass</span>
          <span className="cshell-brand__area">{area}</span>
        </Link>
        {active ? <span className="cshell-top__here">{active.label}</span> : null}
        <span className="cshell-top__spacer" />
        <span className="cshell-user">
          <span className="cshell-user__avatar" aria-hidden>
            {person.trim().charAt(0).toUpperCase() || "B"}
          </span>
          <span className="cshell-user__text">
            <span className="cshell-user__name">{person}</span>
            <span className="cshell-user__role">{role}</span>
          </span>
        </span>
      </header>

      <button type="button" className="cshell-scrim" tabIndex={-1} aria-hidden onClick={() => setOpen(false)} />

      <div className="cshell-body">
        <nav id="cshell-drawer" className="cshell-side" aria-label={`${area} menu`} data-lenis-prevent>
          <div className="cshell-side__head">
            <span className="cshell-side__title">{area}</span>
            <button type="button" className="cshell-side__close" aria-label="Close menu" onClick={() => { setOpen(false); burger.current?.focus(); }}>
              <ConsoleIcon name="close" />
            </button>
          </div>
          {groups.map((group) => (
            <div className="cshell-side__group" key={group.label}>
              <span className="cshell-side__label">{group.label}</span>
              {group.items.map((item) => {
                const current = item === active;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={current ? "cshell-side__link is-active" : "cshell-side__link"}
                    aria-current={current ? "page" : undefined}
                  >
                    <ConsoleIcon name={item.icon} />
                    <span className="cshell-side__text">{item.label}</span>
                    {item.count && item.count > 0 ? (
                      <span className="cshell-side__count" aria-label={`${item.count} waiting`}>
                        {item.count > 99 ? "99+" : item.count}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          ))}
          <div className="cshell-side__foot">
            <Link href={exit.href} className="cshell-side__link">
              <ConsoleIcon name="external" />
              <span className="cshell-side__text">{exit.label}</span>
            </Link>
          </div>
        </nav>
        <main className="cshell-main">{children}</main>
      </div>
    </div>
  );
}
