"use client";

import NewTripForm, { type CalendarChoices } from "@/components/operator/NewTripForm";

/** The whole of a new trip on one page, with everything the trip's own page can change afterwards. */
export default function NewTripPanel({ defaultTimezone, calendar }: { defaultTimezone: string; calendar: CalendarChoices }) {
  return <NewTripForm defaultTimezone={defaultTimezone} calendar={calendar} />;
}
