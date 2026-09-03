"use client";

import { useEffect, useRef, useState, useTransition, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import Field from "@/components/auth/Field";
import { buildLeadsHref } from "@/lib/services/operators/operator-outreach-list";

const DEBOUNCE_MS = 350;

/**
 * Searches as you type rather than waiting for Enter/submit - the debounce is what makes that
 * survive fast typing without firing a navigation per keystroke. Enter still works, flushing
 * immediately instead of waiting out the debounce.
 *
 * isPending swaps the magnifier for a spinner while the new result set is loading - without it,
 * someone typing a search sees the list just sit there for a beat with no sign anything happened.
 */
export default function LeadSearchField({
  defaultValue,
  filter,
  source,
  category,
}: {
  defaultValue: string;
  filter: string;
  source: string;
  category: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(defaultValue);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const navigate = (q: string) => {
    const href = buildLeadsHref({ filter, source, category, q, page: 1 });
    startTransition(() => {
      router.replace(href, { scroll: false });
    });
  };

  const handleChange = (next: string) => {
    setValue(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => navigate(next), DEBOUNCE_MS);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    if (timerRef.current) clearTimeout(timerRef.current);
    navigate(value);
  };

  return (
    <Field
      label="Search"
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      placeholder="Business name, region, category, email…"
      hint={value ? `Showing “${value}” — clear to see everyone` : undefined}
      autoComplete="off"
      icon={
        isPending ? (
          <span className="crm-spinner" aria-hidden="true" />
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
        )
      }
    />
  );
}
