import { describe, expect, it } from "vitest";
import { findCountryByDial, findCountryByIso } from "@/lib/countries";
import { clampNational, parsePhoneInput, toE164 } from "@/lib/phone";

const AU = findCountryByIso("AU")!;
const ID = findCountryByIso("ID")!;
const US = findCountryByIso("US")!;

describe("parsePhoneInput", () => {
  it("strips the trunk prefix from a national number", () => {
    // The exact shape that reached the database as `08123456789`.
    const { country, national } = parsePhoneInput("08123456789", ID);
    expect(country.iso).toBe("ID");
    expect(toE164(country, national)).toBe("+628123456789");
  });

  it("keeps separators out of the result", () => {
    const { national } = parsePhoneInput("400 000 000", AU);
    expect(national).toBe("400000000");
  });

  it("adopts the country from a pasted + number", () => {
    const { country, national } = parsePhoneInput("+62 812 3456 789", AU);
    expect(country.iso).toBe("ID");
    expect(national).toBe("8123456789");
  });

  it("adopts the country from a pasted 00 number", () => {
    const { country, national } = parsePhoneInput("00614123456789", ID);
    expect(country.iso).toBe("AU");
    expect(national).toBe("4123456789");
  });

  it("does not treat a bare number as international", () => {
    // Without a + or 00, "61..." is national digits, not Australia.
    const { country, national } = parsePhoneInput("61234567", ID);
    expect(country.iso).toBe("ID");
    expect(national).toBe("61234567");
  });

  it("leaves the selection alone when the dial code is unknown", () => {
    const { country } = parsePhoneInput("+9995551234", AU);
    expect(country.iso).toBe("AU");
  });

  it("holds the total to the E.164 ceiling", () => {
    const { country, national } = parsePhoneInput("4".repeat(30), AU);
    expect(`${country.dial}${national}`).toHaveLength(15);
  });
});

describe("findCountryByDial", () => {
  it("prefers the longest matching dial code", () => {
    // "1264" (Anguilla) must win over "1" (US) on a shared prefix.
    expect(findCountryByDial("12645551234")?.iso).toBe("AI");
    expect(findCountryByDial("12125551234")?.iso).toBe("US");
  });

  it("resolves shared dial codes to the designated primary", () => {
    expect(findCountryByDial("15551234567")?.iso).toBe("US"); // not CA
    expect(findCountryByDial("79161234567")?.iso).toBe("RU"); // not KZ
    expect(findCountryByDial("447700900123")?.iso).toBe("GB"); // not GG/IM/JE
    expect(findCountryByDial("393331234567")?.iso).toBe("IT"); // not VA
  });
});

describe("toE164", () => {
  it("withholds a number that is too short to be real", () => {
    expect(toE164(AU, "123")).toBe("");
    expect(toE164(AU, "1234")).toBe("+611234");
  });
});

describe("clampNational", () => {
  it("reserves room for the dial code", () => {
    expect(clampNational("9".repeat(15), US)).toHaveLength(14); // dial "1"
    expect(clampNational("9".repeat(15), ID)).toHaveLength(13); // dial "62"
  });
});
