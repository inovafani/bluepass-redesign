import Link from "next/link";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import NewTripPanel from "@/components/operator/NewTripPanel";
import type { CalendarChoices } from "@/components/operator/NewTripForm";
import { prisma } from "@/lib/db/prisma";
import { googleCalendarApi } from "@/lib/services/rails/google/api";
import { operatorCalendars } from "@/lib/services/rails/google/sync";
import RailsUnavailable from "@/components/rails/RailsUnavailable";
import { requireRailsOperator } from "@/lib/services/rails/guard";
import { DEFAULT_ZONE } from "@/lib/services/rails/views";

export const metadata = { title: "New trip · Bluepass" };

/** Where a trip is made, in one go: what it is, when it runs, what it costs, then publish. */
export default async function NewTripPage() {
  const { profile, rails } = await requireRailsOperator("/operator/trips/new");
  if (!rails.enabled) return <RailsUnavailable title="New trip" reason={rails.reason} />;

  // The operator's own calendars, read live, so the picker shows what is in their account.
  const connection = await prisma.operatorGoogleConnection.findUnique({ where: { operatorProfileId: profile.id }, select: { status: true } });
  const google = googleCalendarApi();
  let calendar: CalendarChoices = { state: "not_connected", calendars: null };
  if (connection?.status === "CONNECTED" && google) {
    const calendars = await operatorCalendars(profile.id, google).catch(() => null);
    calendar = { state: calendars ? "connected" : "unreadable", calendars };
  } else if (connection) {
    calendar = { state: "unreadable", calendars: null };
  }

  return (
    <>
      <p className="ds-caption rl-crumb">
        <Link href="/operator/trips">Trips</Link> <span aria-hidden>›</span> New
      </p>
      <AdminPageHeader
        title="New trip"
        support="Everything travellers need in one go: what it is, when it runs and what it costs. Publish when it is ready."
      />
      {profile.rezdySupplierId ? (
        <div className="adm-card adm-empty">
          <p className="ds-body-sm adm-empty__title">Your trips come from Rezdy.</p>
          <p className="ds-body-sm adm-empty__body">
            Add or change them in Rezdy and they appear here on their own. <Link href="/operator/connections">See the connection</Link>.
          </p>
        </div>
      ) : (
        <NewTripPanel defaultTimezone={DEFAULT_ZONE} calendar={calendar} />
      )}
    </>
  );
}
