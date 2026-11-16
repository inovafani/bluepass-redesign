"use client";

import NewTripForm from "@/components/operator/NewTripForm";

/** The whole of a new trip on one page: what it is, when it runs, what it costs, where guests meet. */
export default function NewTripPanel({ defaultTimezone }: { defaultTimezone: string }) {
  return <NewTripForm defaultTimezone={defaultTimezone} />;
}
