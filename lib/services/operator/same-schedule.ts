/**
 * Whether two schedule patterns are the same pattern: same days, times, seats, rules, time zone and
 * season. Used before a new pattern is created, so a form sent twice (a double click, a second tab)
 * cannot leave two identical rows that both sell the same departures.
 *
 * Pure and free of the database on purpose, so it is covered by the default test run.
 */
export type SchedulePattern = {
  weekdays: number[];
  departureTimes: string[];
  capacityPerDeparture: number;
  minGuests: number;
  cutoffHours: number;
  maxAdvanceDays: number;
  timezone: string;
  seasonStart: Date | null;
  seasonEnd: Date | null;
};

const sameSet = <T,>(a: T[], b: T[]) => a.length === b.length && [...a].sort().every((v, i) => v === [...b].sort()[i]);
const sameDate = (a: Date | null, b: Date | null) => (a?.getTime() ?? null) === (b?.getTime() ?? null);

export function sameSchedule(a: SchedulePattern, b: SchedulePattern): boolean {
  return (
    sameSet(a.weekdays, b.weekdays) &&
    sameSet(a.departureTimes, b.departureTimes) &&
    a.capacityPerDeparture === b.capacityPerDeparture &&
    a.minGuests === b.minGuests &&
    a.cutoffHours === b.cutoffHours &&
    a.maxAdvanceDays === b.maxAdvanceDays &&
    a.timezone === b.timezone &&
    sameDate(a.seasonStart, b.seasonStart) &&
    sameDate(a.seasonEnd, b.seasonEnd)
  );
}
