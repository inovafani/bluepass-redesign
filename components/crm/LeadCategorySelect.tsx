"use client";

import { useRouter } from "next/navigation";
import { buildLeadsHref } from "@/lib/services/operators/operator-outreach-list";

/** Navigates on change, same as the Market/Stage pills - just a dropdown instead of pills because
 * there are too many categories to lay out as a pill row without it wrapping into a mess. */
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

  return (
    <select
      className="crm-select"
      aria-label="Lead category filter"
      value={value}
      onChange={(event) => {
        router.push(buildLeadsHref({ filter, source, category: event.target.value, q, page: 1 }), {
          scroll: false,
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
  );
}
