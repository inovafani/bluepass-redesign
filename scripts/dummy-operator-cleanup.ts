/**
 * Clears the leftovers of operator-console testing from the dummy operator, and nothing else.
 *
 *   npx tsx --env-file=.env.local scripts/dummy-operator-cleanup.ts report
 *   npx tsx --env-file=.env.local scripts/dummy-operator-cleanup.ts run
 *
 * Everything is found through the one profile named "Dummy Marine Tours (test)", and each step
 * refuses rather than guesses: a draft is only deleted while it is a DRAFT with no bookings, the
 * test booking only while it is cancelled, unpaid and has no guest email.
 *
 * Removes, in one transaction:
 *   - the "QA Package Draft" listing (its schedules, rates, blackouts and holds cascade)
 *   - booking BP-EX6CR9 and its events (a cancelled, unpaid manual booking with no contact)
 *   - the calendar feed token (it is minted again the next time Connections is opened)
 *   - the cancellation-policy override, back to null, and its two audit lines in profile.notes
 *   - deactivated schedule patterns and rates on Testing Trip 2 (edits and removals only
 *     deactivate; these rows no longer have any effect)
 */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

const COMPANY = "Dummy Marine Tours (test)";
const DRAFT_SLUG = "qa-package-draft";
const TRIP_SLUG = "testing-trip-2";
const BOOKING_REF = "BP-EX6CR9";
const AUDIT_LINE = /^Cancellation policy updated by dummy-operator@ops\.bluepass\.co on 2026-10-30\.$/;

async function scope() {
  const profile = await prisma.operatorProfile.findFirst({
    where: { companyName: COMPANY },
    select: { id: true, notes: true, cancellationPolicyTiers: true },
  });
  if (!profile) throw new Error(`No profile named "${COMPANY}".`);

  const draft = await prisma.operatorListing.findFirst({
    where: { slug: DRAFT_SLUG, operatorProfileId: profile.id },
    select: { id: true, status: true },
  });
  const trip = await prisma.operatorListing.findFirst({ where: { slug: TRIP_SLUG, operatorProfileId: profile.id }, select: { id: true } });
  const booking = await prisma.listingBooking.findFirst({
    where: { reference: BOOKING_REF, operatorProfileId: profile.id },
    select: { id: true, status: true, paymentStatus: true, leadEmail: true },
  });

  const [draftBookings, inactiveSchedules, inactiveRates, settings] = await Promise.all([
    draft ? prisma.listingBooking.count({ where: { listingId: draft.id } }) : 0,
    trip ? prisma.listingSchedule.findMany({ where: { listingId: trip.id, active: false }, select: { id: true } }) : [],
    trip ? prisma.listingRate.findMany({ where: { listingId: trip.id, active: false }, select: { id: true } }) : [],
    prisma.operatorRailsSettings.findUnique({ where: { operatorProfileId: profile.id }, select: { calendarFeedToken: true } }),
  ]);
  const scheduleBookings = inactiveSchedules.length
    ? await prisma.listingBooking.count({ where: { scheduleId: { in: inactiveSchedules.map((s) => s.id) } } })
    : 0;

  const lines = (profile.notes ?? "").split("\n");
  const auditLines = lines.filter((l) => AUDIT_LINE.test(l));

  return { profile, draft, trip, booking, draftBookings, inactiveSchedules, inactiveRates, settings, scheduleBookings, lines, auditLines };
}

async function report() {
  const s = await scope();
  console.log(`draft "${DRAFT_SLUG}":        ${s.draft ? `1 (${s.draft.status}, ${s.draftBookings} bookings)` : "0"}`);
  console.log(`booking ${BOOKING_REF}:        ${s.booking ? `1 (${s.booking.status}, ${s.booking.paymentStatus}, email ${s.booking.leadEmail ?? "none"})` : "0"}`);
  console.log(`calendar feed token:        ${s.settings?.calendarFeedToken ? "set" : "null"}`);
  console.log(`cancellation policy:        ${s.profile.cancellationPolicyTiers === null ? "null" : "override present"}`);
  console.log(`audit lines in notes:       ${s.auditLines.length}`);
  console.log(`inactive schedules (trip):  ${s.inactiveSchedules.length} (${s.scheduleBookings} bookings point at them)`);
  console.log(`inactive rates (trip):      ${s.inactiveRates.length}`);
}

async function run() {
  const s = await scope();

  if (s.draft && s.draft.status !== "DRAFT") throw new Error("Refusing: the QA draft is no longer a DRAFT.");
  if (s.draftBookings) throw new Error("Refusing: the QA draft has bookings.");
  if (s.booking && (s.booking.status !== "CANCELLED" || s.booking.paymentStatus !== "UNPAID" || s.booking.leadEmail)) {
    throw new Error(`Refusing: ${BOOKING_REF} is not a cancelled, unpaid booking without a guest email.`);
  }
  if (s.scheduleBookings) throw new Error("Refusing: a booking still points at a deactivated schedule.");

  const notes = s.lines.filter((l) => !AUDIT_LINE.test(l)).join("\n").trimEnd();

  await prisma.$transaction(async (tx) => {
    if (s.booking) {
      await tx.listingSeatHold.deleteMany({ where: { bookingId: s.booking.id } });
      await tx.listingBooking.delete({ where: { id: s.booking.id } }); // events cascade
    }
    if (s.draft) await tx.operatorListing.delete({ where: { id: s.draft.id } }); // schedules, rates, blackouts cascade
    if (s.settings?.calendarFeedToken) {
      await tx.operatorRailsSettings.update({ where: { operatorProfileId: s.profile.id }, data: { calendarFeedToken: null } });
    }
    await tx.operatorProfile.update({
      where: { id: s.profile.id },
      data: { cancellationPolicyTiers: Prisma.DbNull, notes: notes || null },
    });
    if (s.inactiveSchedules.length) await tx.listingSchedule.deleteMany({ where: { id: { in: s.inactiveSchedules.map((x) => x.id) } } });
    if (s.inactiveRates.length) await tx.listingRate.deleteMany({ where: { id: { in: s.inactiveRates.map((x) => x.id) } } });
  });

  console.log("Cleaned. Run `report` to confirm everything reads 0 or null.");
}

async function main() {
  const command = process.argv[2];
  if (command === "report") return report();
  if (command === "run") return run();
  throw new Error("Usage: dummy-operator-cleanup.ts report | run");
}

main().finally(() => prisma.$disconnect());
