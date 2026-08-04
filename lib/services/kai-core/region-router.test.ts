import { describe, expect, it } from "vitest";
import { detectKaiRegion } from "./region-router";

describe("detectKaiRegion", () => {
  it("detects Indonesia from Komodo/Raja Ampat mentions", () => {
    expect(detectKaiRegion("Tell me about Komodo liveaboards")).toBe("indonesia");
    expect(detectKaiRegion("I want a trip to Raja Ampat")).toBe("indonesia");
  });

  it("detects Australia from Gold Coast/Australia mentions", () => {
    expect(detectKaiRegion("What's available on the Gold Coast?")).toBe("australia");
    expect(detectKaiRegion("Looking for a charter in Australia")).toBe("australia");
  });

  it("returns ambiguous for a generic greeting mentioning neither region", () => {
    expect(detectKaiRegion("Hi, what trips do you have?")).toBe("ambiguous");
  });

  it("returns ambiguous when both regions are mentioned in the same message", () => {
    expect(detectKaiRegion("Komodo or Gold Coast, which is better?")).toBe("ambiguous");
  });
});
