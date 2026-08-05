import { findCountryByDial, type Country } from "@/lib/countries";

/**
 * Turning whatever someone types into E.164.
 *
 * Split out of `components/auth/PhoneField.tsx` because this is the part with
 * the edge cases — trunk prefixes, pasted international numbers, the length
 * ceiling — and `vitest.config.ts` only collects tests under `lib/`.
 */

/** E.164 caps the whole number — dial code included — at 15 digits. */
export const E164_MAX_DIGITS = 15;
/** Shortest real subscriber numbers (Niue, Tokelau) run to four digits. */
export const NATIONAL_MIN_DIGITS = 4;

export type ParsedPhone = {
  country: Country;
  /** National digits: no trunk prefix, no dial code, no separators. */
  national: string;
};

/**
 * Accepts what people actually paste.
 *
 * `+61412…` and `0061412…` carry their own country, so we adopt it rather than
 * stacking it on top of whatever is currently selected. A plain `0412…` is a
 * national number whose trunk prefix would corrupt the E.164 form, so the
 * leading zeros come off — that single rule is what stops the `08123456789`
 * shape that the free-text field used to let through.
 */
export function parsePhoneInput(raw: string, current: Country): ParsedPhone {
  const international = /^\s*(\+|00)/.test(raw);
  let digits = raw.replace(/\D/g, "");
  let country = current;

  if (international) {
    const withoutIddPrefix = digits.replace(/^00/, "");
    const detected = findCountryByDial(withoutIddPrefix);

    if (detected) {
      country = detected;
      digits = withoutIddPrefix.slice(detected.dial.length);
    }
  }

  return { country, national: clampNational(digits.replace(/^0+/, ""), country) };
}

/** Trims to whatever the dial code leaves within the E.164 budget. */
export function clampNational(digits: string, country: Country) {
  return digits.slice(0, E164_MAX_DIGITS - country.dial.length);
}

/** E.164, or `""` while the number is too short to be a real one. */
export function toE164(country: Country, national: string) {
  return national.length >= NATIONAL_MIN_DIGITS ? `+${country.dial}${national}` : "";
}
