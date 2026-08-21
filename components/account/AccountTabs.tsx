"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

const TABS = [
  { key: "trips", label: "Your trips" },
  { key: "saved", label: "Saved trips" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

/**
 * Two real tabs, not two anchors into one long scroll — bookings and saved trips only look like
 * the same feature when they're stacked on top of each other. Modelled on Swee Lee's account
 * switcher (Detail Akun | Orders | Wishlist | ...), which is a store dealing with the exact same
 * "orders" vs "wishlist" distinction this page has.
 *
 * `tripsPanel`/`savedPanel` are rendered server-side in page.tsx (the actual booking/saved-trip
 * data fetch stays a server component) and handed in as children - this component only owns which
 * one is visible, so switching tabs never re-fetches anything.
 *
 * `initialTab` comes from the server (page.tsx already reads `?tab=` from its own `searchParams`
 * prop) rather than this component calling `useSearchParams()` itself - that hook needs a
 * Suspense boundary in the App Router, and local state plus `router.replace` for the URL is
 * enough here since nothing downstream needs to react to the query string changing.
 */
export default function AccountTabs({
  initialTab,
  tripsPanel,
  savedPanel,
}: {
  initialTab: TabKey;
  tripsPanel: ReactNode;
  savedPanel: ReactNode;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>(initialTab);

  const select = (next: TabKey) => {
    setTab(next);
    router.replace(next === "saved" ? "/account?tab=saved" : "/account", { scroll: false });
  };

  return (
    <>
      <nav className="acct-tabs" aria-label="Account sections">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`acct-tabs__item ds-body ${tab === t.key ? "is-active" : ""}`}
            aria-current={tab === t.key ? "page" : undefined}
            onClick={() => select(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "trips" ? tripsPanel : savedPanel}
    </>
  );
}
