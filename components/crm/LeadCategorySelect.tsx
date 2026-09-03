"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { buildLeadsHref } from "@/lib/services/operators/operator-outreach-list";

/** Navigates on change, same as the Market/Stage pills - just a dropdown instead of pills because
 * there are too many categories to lay out as a pill row without it wrapping into a mess.
 *
 * isPending disables the select and shows a spinner beside it mid-navigation, so picking a
 * category doesn't leave the old table sitting there looking like the click did nothing. */
export default function LeadCategorySelect({
  options,
  value,
  filter,
  source,
  q,
}: {
  options: string[];
  value: string;
  filter: string;
  source: string;
  q: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <span className="crm-select-wrap">
      <select
        className="crm-select"
        aria-label="Lead category filter"
        value={value}
        disabled={isPending}
        onChange={(event) => {
          const href = buildLeadsHref({ filter, source, category: event.target.value, q, page: 1 });
          startTransition(() => {
            router.push(href, { scroll: false });
          });
        }}
      >
        <option value="all">All categories</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {isPending ? <span className="crm-spinner" aria-hidden="true" /> : null}
    </span>
  );
}
