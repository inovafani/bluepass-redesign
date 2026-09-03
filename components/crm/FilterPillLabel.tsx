"use client";

import { useLinkStatus } from "next/link";
import type { ReactNode } from "react";

/**
 * Renders inside a Market/Stage <Link> to show that specific pill's own navigation as pending -
 * useLinkStatus only reports for whichever Link it's nested in, so clicking "Australia" spins just
 * that pill rather than the whole filter bar, and the rest of the UI stays exactly as it was.
 */
export default function FilterPillLabel({ children }: { children: ReactNode }) {
  const { pending } = useLinkStatus();

  return (
    <>
      {children}
      {pending ? <span className="crm-spinner crm-pill__spinner" aria-hidden="true" /> : null}
    </>
  );
}
