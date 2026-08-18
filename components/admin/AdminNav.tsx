"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_SECTIONS, activeAdminSection } from "@/lib/services/admin/sections";

/**
 * The console's persistent rail.
 *
 * Everything it renders comes from `ADMIN_SECTIONS`, so a new section is one
 * row of data rather than an edit here. It is a client component only because
 * the active highlight needs `usePathname()` — the counts are resolved on the
 * server and handed down.
 */
export default function AdminNav({
  adminEmail,
  counters,
}: {
  adminEmail: string;
  counters: { pendingApprovals: number };
}) {
  const pathname = usePathname();
  const active = activeAdminSection(pathname);

  return (
    <nav className="adm-nav" aria-label="Admin sections">
      <Link href="/admin" className="adm-nav__brand">
        <span className="adm-nav__mark" aria-hidden>
          <Image src="/bluepass-logo-transparent.png" alt="" width={28} height={28} />
        </span>
        <span className="adm-nav__brand-text">
          <span className="ds-body-sm adm-nav__wordmark">Bluepass</span>
          <span className="ds-micro adm-nav__eyebrow">Admin</span>
        </span>
      </Link>

      <ul className="adm-nav__list">
        {ADMIN_SECTIONS.map((section) => {
          const count = section.counter ? counters[section.counter] : 0;
          const isActive = active?.href === section.href;

          return (
            <li key={section.href}>
              <Link
                href={section.href}
                className={`adm-nav__link ds-body-sm ${isActive ? "is-active" : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                <span className="adm-nav__label">{section.label}</span>
                {section.counter && count > 0 ? (
                  <span className="ds-micro adm-nav__count" aria-label={`${count} waiting`}>
                    {count}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="adm-nav__foot">
        <span className="ds-micro adm-nav__foot-label">Signed in as</span>
        <span className="ds-caption adm-nav__foot-value">{adminEmail}</span>
        <Link href="/" className="ds-micro adm-nav__exit">
          ← Back to the site
        </Link>
      </div>
    </nav>
  );
}
