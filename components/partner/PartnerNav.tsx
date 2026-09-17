"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PARTNER_SECTIONS, activePartnerSection } from "@/lib/services/partner/sections";

/**
 * The partner area's rail — the admin/operator rail's markup and classes again (see OperatorNav for
 * why). Only the eyebrow, the sections, and the identity line differ.
 */
export default function PartnerNav({ handle, email }: { handle: string | null; email: string }) {
  const pathname = usePathname();
  const active = activePartnerSection(pathname);

  return (
    <nav className="adm-nav" aria-label="Partner sections">
      <Link href="/partner-portal" className="adm-nav__brand">
        <span className="adm-nav__mark" aria-hidden>
          <Image src="/bluepass-logo-transparent.png" alt="" width={28} height={28} />
        </span>
        <span className="adm-nav__brand-text">
          <span className="ds-body-sm adm-nav__wordmark">Bluepass</span>
          <span className="ds-micro adm-nav__eyebrow">Partner</span>
        </span>
      </Link>

      <ul className="adm-nav__list">
        {PARTNER_SECTIONS.map((section) => {
          const isActive = active?.href === section.href;

          return (
            <li key={section.href}>
              <Link
                href={section.href}
                className={`adm-nav__link ds-body-sm ${isActive ? "is-active" : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                <span className="adm-nav__label">{section.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="adm-nav__foot">
        <span className="ds-micro adm-nav__foot-label">Signed in as</span>
        <span className="ds-caption adm-nav__foot-value">{handle ?? email}</span>
        <Link href="/" className="ds-micro adm-nav__exit">
          ← Back to the site
        </Link>
      </div>
    </nav>
  );
}
