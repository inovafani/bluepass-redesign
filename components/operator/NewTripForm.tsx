"use client";

import Link from "next/link";
import { useActionState, useRef, useState, useTransition, type FormEvent } from "react";
import ImagePicker from "@/components/admin/blog/ImagePicker";
import Field from "@/components/auth/Field";
import TripGallery from "@/components/operator/TripGallery";
import ActionNotice from "@/components/rails/ActionNotice";
import { NumberField } from "@/components/rails/ScheduleEditor";
import { createTripAction, type RailsActionState } from "@/app/operator/rails-actions";
import { describeWeekdays, formatLocalTime, OPERATOR_TIMEZONES, WEEKDAY_SHORT } from "@/lib/services/rails/format";

const IDLE: RailsActionState = { status: "idle" };

export type CalendarChoices = {
  state: "connected" | "not_connected" | "unreadable";
  calendars: { id: string; summary: string; primary: boolean }[] | null;
};

type Pattern = {
  key: number;
  days: number[];
  times: string[];
  capacity: string;
  minGuests: string;
  cutoffHours: string;
  maxAdvanceDays: string;
  timezone: string;
  seasonal: boolean;
  seasonStart: string;
  seasonEnd: string;
};
type OneOff = { key: number; date: string; time: string; capacity: string };
type Rate = { key: number; label: string; amount: string; per: "guest" | "booking"; more: boolean; minAge: string; maxAge: string; seasonStart: string; seasonEnd: string };
type Closed = { key: number; startDate: string; endDate: string; reason: string };

/** Replaces one row of a list state by its key. */
function patch<T extends { key: number }>(set: React.Dispatch<React.SetStateAction<T[]>>, key: number, change: Partial<T>) {
  set((cur) => cur.map((x) => (x.key === key ? { ...x, ...change } : x)));
}

/**
 * A whole trip on one page: what it is and its photos, when it runs, what it costs, closed dates and
 * what guests need on the day. Publish puts it on sale; Save as draft keeps it private. Everything the
 * trip's own page can change afterwards is asked for here too, so nothing has to be filled in twice.
 */
export default function NewTripForm({ defaultTimezone, calendar }: { defaultTimezone: string; calendar: CalendarChoices }) {
  const [state, formAction, pending] = useActionState(createTripAction, IDLE);
  const [, startTransition] = useTransition();
  const next = useRef(1);
  const id = () => next.current++;

  const [values, setValues] = useState({ title: "", category: "", region: "", heroImageUrl: "", priceSignal: "", meetingPoint: "" });
  const [gallery, setGallery] = useState<string[]>([]);
  const [patterns, setPatterns] = useState<Pattern[]>(() => [blankPattern(0, defaultTimezone, [2, 4, 6])]);
  const [oneOffs, setOneOffs] = useState<OneOff[]>([]);
  const [rates, setRates] = useState<Rate[]>(() => [blankRate(0, "Adult")]);
  const [defaultRate, setDefaultRate] = useState(0);
  const [closed, setClosed] = useState<Closed[]>([]);
  const set = (field: keyof typeof values) => (value: string) => setValues((current) => ({ ...current, [field]: value }));

  // Sent by hand rather than as the form's action: an action form empties every field it does not
  // control once it returns, and a refused trip should leave what was typed exactly where it was.
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget, (event.nativeEvent as SubmitEvent).submitter);
    startTransition(() => formAction(data));
  };

  const zone = patterns[0]?.timezone ?? defaultTimezone;
  const json = {
    schedules: patterns.map((p) => ({
      weekdays: p.days, times: p.times, capacity: p.capacity, minGuests: p.minGuests, cutoffHours: p.cutoffHours,
      maxAdvanceDays: p.maxAdvanceDays, timezone: p.timezone,
      seasonStart: p.seasonal ? p.seasonStart : "", seasonEnd: p.seasonal ? p.seasonEnd : "",
    })),
    oneOffs: oneOffs.map((o) => ({ date: o.date, time: o.time, capacity: o.capacity, timezone: zone })),
    rates: rates.map((r) => ({
      label: r.label, amount: r.amount, per: r.per, isDefault: r.key === defaultRate,
      minAge: r.more ? r.minAge : "", maxAge: r.more ? r.maxAge : "", seasonStart: r.more ? r.seasonStart : "", seasonEnd: r.more ? r.seasonEnd : "",
    })),
    closed: closed.map((c) => ({ startDate: c.startDate, endDate: c.endDate, reason: c.reason })),
    gallery: gallery.map((url) => ({ url })),
  };

  return (
    <form
      onSubmit={submit}
      // Enter in a text box must not put a half-read trip on sale; only the buttons submit.
      onKeyDown={(event) => { if (event.key === "Enter" && (event.target as HTMLElement).tagName === "INPUT") event.preventDefault(); }}
      className="adm-form__section"
      style={{ marginTop: 16 }}
    >
      {(Object.keys(json) as (keyof typeof json)[]).map((name) => (
        <input key={name} type="hidden" name={name} value={JSON.stringify(json[name])} />
      ))}

      <h2 className="ds-headline">The trip</h2>
      <div className="adm-form__grid">
        <div className="adm-form__row adm-form__row--wide">
          <Field label="Title" name="title" value={values.title} onChange={set("title")} placeholder="Whitsundays Sailing Day" autoComplete="off" required />
        </div>
        <div className="adm-form__row">
          <Field label="Category" name="category" value={values.category} onChange={set("category")} placeholder="Sailing" autoComplete="off" required />
        </div>
        <div className="adm-form__row">
          <Field label="Region" name="region" value={values.region} onChange={set("region")} placeholder="Whitsundays" autoComplete="off" required />
        </div>
        <div className="adm-form__row adm-form__row--wide">
          <label className="afield">
            <span className="afield__top">
              <span className="ds-micro afield__label">Description</span>
            </span>
            <span className="afield__well">
              <textarea name="description" rows={5} className="afield__input adm-textarea" placeholder="What travellers should know before they book." required />
            </span>
          </label>
        </div>
      </div>

      <h2 className="ds-headline" style={{ marginTop: 32 }}>Photos</h2>
      <div className="adm-form__grid">
        <div className="adm-form__row adm-form__row--wide rl-photo">
          <ImagePicker
            label="Cover photo"
            hint="Optional. The picture travellers see first."
            value={values.heroImageUrl}
            onChange={set("heroImageUrl")}
            endpoint="/api/operator/listing-image"
            accept="image/jpeg,image/png,image/webp,image/avif"
            spec="Any size: shrunk to HD, under 500 KB · JPG, PNG, WebP or AVIF"
            aspect="16 / 9"
            allowUrl={false}
            compress
          />
          <input type="hidden" name="heroImageUrl" value={values.heroImageUrl} />
        </div>
        <div className="adm-form__row adm-form__row--wide bpe-image">
          <div className="afield__top">
            <span className="ds-micro afield__label">Gallery</span>
            <span className="ds-micro">Optional. Up to 12 more photos.</span>
          </div>
          <TripGallery initialUrls={[]} onChange={setGallery} />
        </div>
      </div>

      <h2 className="ds-headline" style={{ marginTop: 32 }}>When it runs</h2>
      <p className="ds-caption">A pattern, not a calendar. Departures appear on their own for as far ahead as you take bookings.</p>
      <div className="rl-stack">
        {patterns.map((p, index) => (
          <PatternFields
            key={p.key}
            p={p}
            index={index}
            others={patterns.filter((o) => o.key !== p.key)}
            onChange={(change) => patch(setPatterns, p.key, change)}
            onRemove={patterns.length > 1 || oneOffs.length > 0 ? () => setPatterns((cur) => cur.filter((x) => x.key !== p.key)) : undefined}
            titled={patterns.length > 1}
          />
        ))}
        {oneOffs.map((o) => (
          <div key={o.key} className="adm-card rl-form">
            <p className="ds-body-sm rl-form__lede">A one-off departure, outside the usual pattern, like a New Year&rsquo;s Eve cruise.</p>
            <div className="rl-grid">
              <label className="rl-field">
                <span className="ds-micro rl-field__label">Date</span>
                <input type="date" value={o.date} required className="rl-input" onChange={(e) => patch(setOneOffs, o.key, { date: e.target.value })} />
              </label>
              <label className="rl-field">
                <span className="ds-micro rl-field__label">Departs at</span>
                <input type="time" value={o.time} step={300} required className="rl-input" onChange={(e) => patch(setOneOffs, o.key, { time: e.target.value })} />
              </label>
              <Num label="Seats" value={o.capacity} min={1} onChange={(capacity) => patch(setOneOffs, o.key, { capacity })} />
            </div>
            <div className="rl-actions">
              <button type="button" className="rl-btn rl-btn--quiet" onClick={() => setOneOffs((cur) => cur.filter((x) => x.key !== o.key))}>Remove</button>
            </div>
          </div>
        ))}
        <div className="rl-actions">
          <button type="button" className="rl-btn rl-btn--secondary" onClick={() => setPatterns((cur) => [...cur, blankPattern(id(), zone, [], cur[0])])}>
            Add another pattern
          </button>
          <button type="button" className="rl-btn rl-btn--quiet" onClick={() => setOneOffs((cur) => [...cur, { key: id(), date: "", time: "17:00", capacity: patterns[0]?.capacity || "12" }])}>
            Add a one-off departure
          </button>
        </div>
      </div>

      <h2 className="ds-headline" style={{ marginTop: 32 }}>Prices</h2>
      <p className="ds-caption">What guests pay is what you set here. Bluepass adds nothing on top.</p>
      <div className="rl-stack">
        {rates.map((r, index) => (
          <RateFields
            key={r.key}
            r={r}
            first={index === 0}
            isDefault={r.key === defaultRate}
            onDefault={() => setDefaultRate(r.key)}
            onChange={(change) => patch(setRates, r.key, change)}
            onRemove={
              rates.length > 1
                ? () => {
                    const rest = rates.filter((x) => x.key !== r.key);
                    setRates(rest);
                    if (r.key === defaultRate) setDefaultRate(rest[0].key);
                  }
                : undefined
            }
          />
        ))}
        <div className="rl-actions">
          <button type="button" className="rl-btn rl-btn--secondary" onClick={() => setRates((cur) => [...cur, blankRate(id(), "")])}>
            Add another price
          </button>
        </div>
        <div className="adm-form__row">
          <Field label="Price text on Discover" name="priceSignal" value={values.priceSignal} onChange={set("priceSignal")} placeholder="From AUD 189" hint="Optional. Without it, Discover shows “From AUD” and your cheapest per-guest price." autoComplete="off" />
        </div>
      </div>

      <h2 className="ds-headline" style={{ marginTop: 32 }}>Closed dates</h2>
      <p className="ds-caption">Days the boat is not going out: maintenance, holidays, the slipway. Optional.</p>
      <div className="rl-stack">
        {closed.map((c) => (
          <div key={c.key} className="adm-card rl-form">
            <div className="rl-grid">
              <label className="rl-field">
                <span className="ds-micro rl-field__label">From</span>
                <input type="date" value={c.startDate} required className="rl-input" onChange={(e) => patch(setClosed, c.key, { startDate: e.target.value })} />
              </label>
              <label className="rl-field">
                <span className="ds-micro rl-field__label">To</span>
                <input type="date" value={c.endDate} className="rl-input" onChange={(e) => patch(setClosed, c.key, { endDate: e.target.value })} />
              </label>
              <label className="rl-field">
                <span className="ds-micro rl-field__label">Reason</span>
                <input value={c.reason} placeholder="Annual maintenance" maxLength={120} className="rl-input" onChange={(e) => patch(setClosed, c.key, { reason: e.target.value })} />
              </label>
            </div>
            <div className="rl-actions">
              <button type="button" className="rl-btn rl-btn--quiet" onClick={() => setClosed((cur) => cur.filter((x) => x.key !== c.key))}>Remove</button>
            </div>
          </div>
        ))}
        <div className="rl-actions">
          <button type="button" className="rl-btn rl-btn--secondary" onClick={() => setClosed((cur) => [...cur, { key: id(), startDate: "", endDate: "", reason: "" }])}>
            Close some dates
          </button>
        </div>
        <BusyCalendar calendar={calendar} />
      </div>

      <h2 className="ds-headline" style={{ marginTop: 32 }}>On the day</h2>
      <p className="ds-caption">Sent in every confirmation and printed on the manifest.</p>
      <div className="rl-form">
        <div className="rl-grid">
          <NumberField label="Trip length" name="hours" defaultValue="" min={0} suffix="hours" />
          <NumberField label="and" name="minutes" defaultValue="" min={0} suffix="minutes" invalid={state.status === "error" && state.field === "durationMinutes"} />
        </div>
        <div className="adm-form__row adm-form__row--wide">
          <Field label="Where guests meet you" name="meetingPoint" value={values.meetingPoint} onChange={set("meetingPoint")} placeholder="Marina berth 12" hint="Goes in every confirmation." autoComplete="off" required />
        </div>
        <label className="rl-field">
          <span className="ds-micro rl-field__label">Note for every guest</span>
          <textarea
            name="confirmationNote"
            rows={4}
            maxLength={1200}
            placeholder="Arrive 20 minutes early. Bring a towel, a hat and reef-safe sunscreen. Lunch is included."
            className="rl-input rl-input--area"
          />
        </label>
      </div>

      <ActionNotice state={state} />
      <div className="adm-form__submit">
        <button type="submit" name="intent" value="publish" disabled={pending} className="rl-btn rl-btn--primary">
          {pending ? "Saving…" : "Publish trip"}
        </button>
        <button type="submit" name="intent" value="draft" disabled={pending} className="rl-btn rl-btn--secondary">
          Save as draft
        </button>
      </div>
    </form>
  );
}

function blankPattern(key: number, timezone: string, days: number[], like?: Pattern): Pattern {
  return {
    key, days, times: ["08:00"], capacity: like?.capacity ?? "12", minGuests: "1", cutoffHours: "24", maxAdvanceDays: "365",
    timezone: like?.timezone ?? timezone, seasonal: false, seasonStart: "", seasonEnd: "",
  };
}

function blankRate(key: number, label: string): Rate {
  return { key, label, amount: "", per: "guest", more: false, minAge: "", maxAge: "", seasonStart: "", seasonEnd: "" };
}

/** A controlled whole-number field in the same look as the trip page's. */
function Num({ label, value, onChange, min, suffix, hint }: { label: string; value: string; onChange: (v: string) => void; min?: number; suffix?: string; hint?: string }) {
  return (
    <label className="rl-field">
      <span className="ds-micro rl-field__label">{label}</span>
      <span className="rl-input rl-input--affix">
        <input type="number" value={value} min={min} step="1" inputMode="numeric" onChange={(e) => onChange(e.target.value)} />
        {suffix ? <span className="ds-caption rl-input__suffix">{suffix}</span> : null}
      </span>
      {hint ? <span className="ds-micro rl-field__hint">{hint}</span> : null}
    </label>
  );
}

function PatternFields({
  p, index, others, onChange, onRemove, titled,
}: {
  p: Pattern;
  index: number;
  others: Pattern[];
  onChange: (change: Partial<Pattern>) => void;
  onRemove?: () => void;
  titled: boolean;
}) {
  const everyDay = p.days.length === 0 || p.days.length === 7;
  // No days ticked means every day, which is right for the first pattern and a trap for an extra one.
  const needsDay = index > 0 && p.days.length === 0;
  const clashes = others
    .filter((o) => o.times.some((t) => p.times.includes(t)))
    .filter((o) => {
      const theirs = o.days.length === 0 ? [0, 1, 2, 3, 4, 5, 6] : o.days;
      const mine = p.days.length === 0 ? [0, 1, 2, 3, 4, 5, 6] : p.days;
      return theirs.some((d) => mine.includes(d));
    });

  return (
    <div className="adm-card rl-form">
      {titled ? <p className="ds-body rl-rows__title">Schedule {index + 1}</p> : null}

      <fieldset className="rl-field">
        <legend className="ds-micro rl-field__label">Days it runs</legend>
        <div className="rl-days" role="group">
          {WEEKDAY_SHORT.map((_, d) => {
            // Monday first, the way a working week is read.
            const day = (d + 1) % 7;
            const on = p.days.includes(day);
            return (
              <label key={day} className={`rl-day-chip${on ? " is-on" : ""}`}>
                <input type="checkbox" value={day} checked={on} onChange={(e) => onChange({ days: e.target.checked ? [...p.days, day] : p.days.filter((x) => x !== day) })} />
                {WEEKDAY_SHORT[day]}
              </label>
            );
          })}
        </div>
        <span className="ds-micro rl-field__hint">{needsDay ? "Pick at least one day." : everyDay ? "Every day" : describeWeekdays(p.days)}</span>
        {clashes.length > 0 ? (
          <span className="ds-micro rl-field__hint" role="status">
            Already running at that time: {clashes.map((o) => `${describeWeekdays(o.days)} · ${o.times.map(formatLocalTime).join(", ")}`).join("; ")}. Days that overlap are not a second boat; change the existing schedule instead.
          </span>
        ) : null}
      </fieldset>

      <fieldset className="rl-field">
        <legend className="ds-micro rl-field__label">Departs at</legend>
        <div className="rl-times">
          {p.times.map((t, i) => (
            <span key={i} className="rl-time">
              <input type="time" value={t} step={300} required onChange={(e) => onChange({ times: p.times.map((x, j) => (j === i ? e.target.value : x)) })} />
              {p.times.length > 1 ? (
                <button type="button" className="rl-time__remove" aria-label={`Remove ${t}`} onClick={() => onChange({ times: p.times.filter((_, j) => j !== i) })}>
                  ✕
                </button>
              ) : null}
            </span>
          ))}
          <button type="button" className="rl-btn rl-btn--quiet rl-btn--sm" onClick={() => onChange({ times: [...p.times, "13:00"] })}>
            + Another time
          </button>
        </div>
      </fieldset>

      <div className="rl-grid">
        <Num label="Seats per departure" value={p.capacity} min={1} onChange={(capacity) => onChange({ capacity })} />
        <Num label="Boat runs with at least" value={p.minGuests} min={1} suffix="guests in total" hint="Counted across all bookings on a departure, not per booking. Guests can book before it is reached; you decide at the end whether it runs." onChange={(minGuests) => onChange({ minGuests })} />
        <Num label="Online bookings close" value={p.cutoffHours} min={0} suffix="hours before" onChange={(cutoffHours) => onChange({ cutoffHours })} />
        <Num label="Open for booking" value={p.maxAdvanceDays} min={1} suffix="days ahead" onChange={(maxAdvanceDays) => onChange({ maxAdvanceDays })} />
      </div>

      <label className="rl-field">
        <span className="ds-micro rl-field__label">Time zone the boat leaves from</span>
        <select value={p.timezone} onChange={(e) => onChange({ timezone: e.target.value })} className="rl-input">
          {OPERATOR_TIMEZONES.map((z) => (
            <option key={z.value} value={z.value}>{z.label}</option>
          ))}
        </select>
      </label>

      <label className="rl-switch">
        <input type="checkbox" checked={p.seasonal} onChange={(e) => onChange({ seasonal: e.target.checked })} />
        <span className="ds-body-sm">Only runs part of the year</span>
      </label>
      {p.seasonal ? (
        <div className="rl-grid">
          <label className="rl-field">
            <span className="ds-micro rl-field__label">Season starts</span>
            <input type="date" value={p.seasonStart} className="rl-input" onChange={(e) => onChange({ seasonStart: e.target.value })} />
          </label>
          <label className="rl-field">
            <span className="ds-micro rl-field__label">Season ends</span>
            <input type="date" value={p.seasonEnd} className="rl-input" onChange={(e) => onChange({ seasonEnd: e.target.value })} />
          </label>
        </div>
      ) : null}

      {onRemove ? (
        <div className="rl-actions">
          <button type="button" className="rl-btn rl-btn--quiet" onClick={onRemove}>Remove this schedule</button>
        </div>
      ) : null}
    </div>
  );
}

function RateFields({
  r, first, isDefault, onDefault, onChange, onRemove,
}: {
  r: Rate;
  first: boolean;
  isDefault: boolean;
  onDefault: () => void;
  onChange: (change: Partial<Rate>) => void;
  onRemove?: () => void;
}) {
  return (
    <div className="adm-card rl-form">
      <div className="rl-grid">
        <label className="rl-field">
          <span className="ds-micro rl-field__label">Name</span>
          <input value={r.label} placeholder="Adult, Child, Private charter" className="rl-input" required maxLength={60} onChange={(e) => onChange({ label: e.target.value })} />
        </label>
        <label className="rl-field">
          <span className="ds-micro rl-field__label">Price</span>
          <span className="rl-input rl-input--affix">
            <span className="ds-caption rl-input__prefix">AUD</span>
            <input value={r.amount} inputMode="decimal" placeholder="189" required onChange={(e) => onChange({ amount: e.target.value })} />
          </span>
        </label>
      </div>

      <div className="rl-segment" role="radiogroup" aria-label="Charged">
        {(
          [
            { value: "guest", label: "Per guest" },
            { value: "booking", label: "Per booking" },
          ] as const
        ).map((o) => (
          <label key={o.value} className={`rl-segment__option${r.per === o.value ? " is-on" : ""}`}>
            <input type="radio" name={`per-${r.key}`} value={o.value} checked={r.per === o.value} onChange={() => onChange({ per: o.value })} />
            <span className="ds-body-sm">{o.label}</span>
          </label>
        ))}
      </div>
      <span className="ds-micro rl-field__hint">{r.per === "guest" ? "Each guest pays this." : "Charged once for the whole group, like a private charter."}</span>

      {r.more ? (
        <div className="rl-grid">
          <Num label="From age" value={r.minAge} min={0} onChange={(minAge) => onChange({ minAge })} />
          <Num label="To age" value={r.maxAge} min={0} onChange={(maxAge) => onChange({ maxAge })} />
          <label className="rl-field">
            <span className="ds-micro rl-field__label">Only from</span>
            <input type="date" value={r.seasonStart} className="rl-input" onChange={(e) => onChange({ seasonStart: e.target.value })} />
          </label>
          <label className="rl-field">
            <span className="ds-micro rl-field__label">Until</span>
            <input type="date" value={r.seasonEnd} className="rl-input" onChange={(e) => onChange({ seasonEnd: e.target.value })} />
          </label>
        </div>
      ) : (
        <button type="button" className="rl-btn rl-btn--quiet rl-btn--sm rl-self-start" onClick={() => onChange({ more: true })}>
          + Age band or season
        </button>
      )}

      <label className="rl-switch">
        <input type="radio" name="default-rate" checked={isDefault} onChange={onDefault} />
        <span className="ds-body-sm">Default price</span>
        <span className="ds-micro rl-field__hint">Quoted when someone asks &ldquo;how much for two&rdquo; without saying ages.</span>
      </label>

      {onRemove && !first ? (
        <div className="rl-actions">
          <button type="button" className="rl-btn rl-btn--quiet" onClick={onRemove}>Remove this price</button>
        </div>
      ) : null}
    </div>
  );
}

/** Which of the operator's own Google calendars closes this trip while it shows them busy. */
function BusyCalendar({ calendar }: { calendar: CalendarChoices }) {
  if (calendar.state === "not_connected") {
    return (
      <p className="ds-caption rl-muted">
        Already keep charters in Google Calendar? <Link href="/operator/connections">Connect it</Link> and your own calendar can close this trip&rsquo;s departures whenever you are busy.
      </p>
    );
  }
  if (calendar.state === "unreadable" || !calendar.calendars) {
    return <p className="ds-caption rl-warn">Your Google calendars could not be listed just now. Check the connection on the <Link href="/operator/connections">Connections</Link> page.</p>;
  }
  return (
    <label className="rl-field">
      <span className="ds-micro rl-field__label">Also close departures when this Google calendar is busy</span>
      <select name="busyCalendarId" defaultValue="" className="rl-input">
        <option value="">No calendar</option>
        {calendar.calendars.map((c) => (
          <option key={c.id} value={c.id}>{c.primary ? `${c.summary} (your main calendar)` : c.summary}</option>
        ))}
      </select>
      <span className="ds-micro rl-field__hint">
        A departure closes for online booking whenever anything in that calendar overlaps the trip. Bluepass sees only the times, never what the event is. You can still take phone bookings on it.
      </span>
    </label>
  );
}
