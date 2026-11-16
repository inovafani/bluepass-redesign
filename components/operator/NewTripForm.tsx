"use client";

import { useActionState, useState, useTransition, type FormEvent } from "react";
import ImagePicker from "@/components/admin/blog/ImagePicker";
import Field from "@/components/auth/Field";
import ActionNotice from "@/components/rails/ActionNotice";
import { NumberField } from "@/components/rails/ScheduleEditor";
import { createTripAction, type RailsActionState } from "@/app/operator/rails-actions";
import { describeWeekdays, OPERATOR_TIMEZONES, WEEKDAY_SHORT } from "@/lib/services/rails/format";

const IDLE: RailsActionState = { status: "idle" };

/**
 * A whole trip on one page: what it is, when it runs, what it costs and where guests meet. Publish
 * puts it on sale; Save as draft keeps it private. Anything finer (ages, seasons, closed dates,
 * more photos) is on the trip's own page afterwards and none of it is needed to sell.
 */
export default function NewTripForm({ defaultTimezone }: { defaultTimezone: string }) {
  const [state, formAction, pending] = useActionState(createTripAction, IDLE);
  const [, startTransition] = useTransition();
  const [values, setValues] = useState({ title: "", category: "", region: "", heroImageUrl: "", amount: "", meetingPoint: "" });
  const [days, setDays] = useState<number[]>([2, 4, 6]);
  const [times, setTimes] = useState<string[]>(["08:00"]);
  const set = (field: keyof typeof values) => (value: string) => setValues((current) => ({ ...current, [field]: value }));
  const everyDay = days.length === 0 || days.length === 7;

  // Sent by hand rather than as the form's action: an action form empties every field it does not
  // control once it returns, and a refused trip should leave what was typed exactly where it was.
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget, (event.nativeEvent as SubmitEvent).submitter);
    startTransition(() => formAction(data));
  };

  return (
    <form
      onSubmit={submit}
      // Enter in a text box must not put a half-read trip on sale; only the buttons submit.
      onKeyDown={(event) => { if (event.key === "Enter" && (event.target as HTMLElement).tagName === "INPUT") event.preventDefault(); }}
      className="adm-form__section"
      style={{ marginTop: 16 }}
    >

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
        <div className="adm-form__row adm-form__row--wide rl-photo">
          <ImagePicker
            label="Cover photo"
            hint="Optional"
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

      <h2 className="ds-headline" style={{ marginTop: 32 }}>When it runs</h2>
      <div className="rl-form">
        <fieldset className="rl-field">
          <legend className="ds-micro rl-field__label">Days it runs</legend>
          <div className="rl-days" role="group" data-field="weekday">
            {WEEKDAY_SHORT.map((_, d) => {
              // Monday first, the way a working week is read.
              const day = (d + 1) % 7;
              return (
                <label key={day} className={`rl-day-chip${days.includes(day) ? " is-on" : ""}`}>
                  <input
                    type="checkbox"
                    name="weekday"
                    value={day}
                    checked={days.includes(day)}
                    onChange={(e) => setDays((cur) => (e.target.checked ? [...cur, day] : cur.filter((x) => x !== day)))}
                  />
                  {WEEKDAY_SHORT[day]}
                </label>
              );
            })}
          </div>
          <span className="ds-micro rl-field__hint">{everyDay ? "Every day" : describeWeekdays(days)}</span>
        </fieldset>

        <fieldset className="rl-field">
          <legend className="ds-micro rl-field__label">Departs at</legend>
          <div className="rl-times">
            {times.map((t, i) => (
              <span key={i} className="rl-time">
                <input type="time" name="time" value={t} step={300} required onChange={(e) => setTimes((cur) => cur.map((x, j) => (j === i ? e.target.value : x)))} />
                {times.length > 1 ? (
                  <button type="button" className="rl-time__remove" aria-label={`Remove ${t}`} onClick={() => setTimes((cur) => cur.filter((_, j) => j !== i))}>
                    ✕
                  </button>
                ) : null}
              </span>
            ))}
            <button type="button" className="rl-btn rl-btn--quiet rl-btn--sm" onClick={() => setTimes((cur) => [...cur, "13:00"])}>
              + Another time
            </button>
          </div>
        </fieldset>

        <div className="rl-grid">
          <NumberField label="Seats per departure" name="capacity" defaultValue={12} min={1} />
          <NumberField label="Online bookings close" name="cutoffHours" defaultValue={24} min={0} suffix="hours before" />
        </div>

        <label className="rl-field">
          <span className="ds-micro rl-field__label">Time zone the boat leaves from</span>
          <select name="timezone" defaultValue={defaultTimezone} className="rl-input">
            {OPERATOR_TIMEZONES.map((z) => (
              <option key={z.value} value={z.value}>{z.label}</option>
            ))}
          </select>
        </label>
      </div>

      <h2 className="ds-headline" style={{ marginTop: 32 }}>Price and meeting point</h2>
      <div className="adm-form__grid">
        <div className="adm-form__row">
          <Field label="Price per guest (AUD)" name="amount" value={values.amount} onChange={set("amount")} inputMode="numeric" placeholder="189" hint="What each guest pays. Child prices and seasons can be added later." autoComplete="off" required />
        </div>
        <div className="adm-form__row">
          <Field label="Where guests meet you" name="meetingPoint" value={values.meetingPoint} onChange={set("meetingPoint")} placeholder="Marina berth 12" hint="Goes in every confirmation." autoComplete="off" required />
        </div>
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
