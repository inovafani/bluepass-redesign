"use client";

import { useId, useState, type KeyboardEvent } from "react";

/**
 * The form field for the auth pages.
 *
 * Everything here is drawn from the design tokens — surface-1 for the well,
 * hairline for the edge, accent-blue for focus. The label sits above in
 * `ds-micro` uppercase, matching the eyebrow treatment the marketing sections
 * use, so a form still reads as part of the same system.
 *
 * Works either way round. The auth pages drive it as a controlled input
 * (`value` + `onChange`); the admin console posts to a server action, where
 * React state would only be a copy of what the browser already holds, so it
 * passes `name` and lets the field own its own value. Supplying `value` is what
 * picks controlled mode.
 */
export default function Field({
  label,
  name,
  type = "text",
  value,
  onChange,
  defaultValue,
  placeholder,
  autoComplete,
  hint,
  required,
  disabled,
  inputMode,
  /** Renders a show/hide toggle — only meaningful for passwords. */
  reveal,
  /**
   * The auth pages have no `<form>` element (their fields are direct children of
   * `.ashell__form`, which GSAP's entrance stagger targets one by one - wrapping them in a
   * `<form>` would collapse that to a single animated block). That means Enter never submits
   * on its own; a page that wants it wires this to whatever its button's onClick already
   * calls. Optional and unused by default, so every other Field consumer (the uncontrolled
   * server-action forms in the admin console) is unaffected.
   */
  onKeyDown,
}: {
  label: string;
  /** Required for uncontrolled use — it is the key in the posted FormData. */
  name?: string;
  type?: string;
  value?: string;
  onChange?: (v: string) => void;
  defaultValue?: string;
  placeholder?: string;
  autoComplete?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  inputMode?: "text" | "email" | "tel" | "url" | "numeric";
  reveal?: boolean;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
}) {
  const id = useId();
  const [shown, setShown] = useState(false);
  const inputType = reveal && shown ? "text" : type;
  const binding =
    value !== undefined
      ? { value, onChange: (e: { target: { value: string } }) => onChange?.(e.target.value) }
      : { defaultValue };

  return (
    <label className="afield" htmlFor={id}>
      <span className="afield__top">
        <span className="ds-micro afield__label">{label}</span>
        {hint ? <span className="ds-micro afield__hint">{hint}</span> : null}
      </span>
      <span className="afield__well">
        <input
          id={id}
          name={name}
          type={inputType}
          {...binding}
          placeholder={placeholder}
          autoComplete={autoComplete}
          inputMode={inputMode}
          required={required}
          disabled={disabled}
          onKeyDown={onKeyDown}
          className="afield__input"
        />
        {reveal ? (
          <button
            type="button"
            className="afield__reveal"
            onClick={() => setShown((v) => !v)}
            aria-label={shown ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {shown ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <path d="M3 3l18 18M10.6 10.7a2 2 0 0 0 2.8 2.8" />
                <path d="M6.5 6.6C4.6 7.9 3.900 9.6 3 12c1.7 3.7 4.9 6 9 6 1.3 0 2.5-.2 3.6-.7M18.9 15.1c.9-.8 1.6-1.8 2.1-3.1-1.7-3.7-4.9-6-9-6" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <path d="M3 12c1.7-3.7 4.9-6 9-6s7.3 2.3 9 6c-1.7 3.7-4.9 6-9 6s-7.3-2.3-9-6z" />
                <circle cx="12" cy="12" r="2.4" />
              </svg>
            )}
          </button>
        ) : null}
      </span>
    </label>
  );
}
