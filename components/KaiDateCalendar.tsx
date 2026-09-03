"use client";

import { useMemo, useState } from "react";

const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

/**
 * Local-calendar-safe date key - deliberately not `.toISOString().slice(0, 10)`, which converts to
 * UTC first and silently shifts the date by one in any timezone ahead of UTC.
 */
function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

/** getDay() is Sunday-first (0-6); the grid header is Monday-first. */
function mondayIndex(date: Date) {
  return (date.getDay() + 6) % 7;
}

/**
 * A month grid of the real open dates Kai found (PmsAdapter.findAvailableDates on the Kai side) -
 * rendered under a "not available" reply so the traveller picks a real date instead of guessing
 * one and hearing the same refusal again. Mirrors boattimeyachtcharters-redesign's
 * KaiDateCalendar, restyled to this panel's own tokens (kmsg/kform/kpay) rather than that site's
 * navy/gold theme.
 */
export default function KaiDateCalendar({
  dates,
  disabled,
  onSelect,
}: {
  dates: string[];
  disabled: boolean;
  onSelect: (date: string) => void;
}) {
  const available = useMemo(() => new Set(dates), [dates]);

  const [visibleMonth, setVisibleMonth] = useState(() => {
    const first = dates[0];
    return startOfMonth(first ? new Date(`${first}T00:00:00`) : new Date());
  });

  const monthLabel = visibleMonth.toLocaleDateString("en-AU", { month: "long", year: "numeric" });
  const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
  const leadingBlanks = mondayIndex(visibleMonth);

  const cells: (Date | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from(
      { length: daysInMonth },
      (_, i) => new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), i + 1),
    ),
  ];

  return (
    <div className="kcal">
      <div className="kcal__nav">
        <button
          type="button"
          className="kcal__nav-btn"
          onClick={() => setVisibleMonth((month) => addMonths(month, -1))}
          disabled={disabled}
          aria-label="Previous month"
        >
          ‹
        </button>
        <span className="ds-micro kcal__month">{monthLabel}</span>
        <button
          type="button"
          className="kcal__nav-btn"
          onClick={() => setVisibleMonth((month) => addMonths(month, 1))}
          disabled={disabled}
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="kcal__weekdays" aria-hidden="true">
        {WEEKDAY_LABELS.map((label, i) => (
          <span key={i}>{label}</span>
        ))}
      </div>

      <div className="kcal__grid">
        {cells.map((date, i) => {
          if (!date) return <span key={`blank-${i}`} className="kcal__cell kcal__cell--blank" />;

          const key = toDateKey(date);
          const isAvailable = available.has(key);

          return (
            <button
              key={key}
              type="button"
              className={`kcal__cell${isAvailable ? " kcal__cell--available" : ""}`}
              disabled={disabled || !isAvailable}
              onClick={() => onSelect(key)}
              aria-label={isAvailable ? `${key}, available` : `${key}, not available`}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
