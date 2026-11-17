import { describe, expect, it } from "vitest";
import { hasPreviewCookie, isPreviewKey, previewCookieValue } from "@/lib/services/discover/preview-access";

const KEY = "a-long-enough-private-key-0123456789";

describe("isPreviewKey", () => {
  it("opens for the configured key", () => {
    expect(isPreviewKey(KEY, { DISCOVER_PREVIEW_KEY: KEY })).toBe(true);
  });

  it("stays shut for any other key", () => {
    expect(isPreviewKey("another-long-enough-private-key-1234", { DISCOVER_PREVIEW_KEY: KEY })).toBe(false);
    expect(isPreviewKey("", { DISCOVER_PREVIEW_KEY: KEY })).toBe(false);
  });

  it("stays shut when no key is configured, so the door only exists on purpose", () => {
    expect(isPreviewKey("anything", {})).toBe(false);
    expect(isPreviewKey("", { DISCOVER_PREVIEW_KEY: "" })).toBe(false);
  });

  it("refuses a key too short to be private", () => {
    expect(isPreviewKey("short", { DISCOVER_PREVIEW_KEY: "short" })).toBe(false);
  });
});

describe("the cookie /preview leaves after the code was typed", () => {
  const env = { DISCOVER_PREVIEW_KEY: KEY };

  it("is accepted for the configured key and never contains it", () => {
    const value = previewCookieValue(env)!;
    expect(value).not.toContain(KEY);
    expect(hasPreviewCookie(value, env)).toBe(true);
  });

  it("stops working when the key is changed, and for anything made up", () => {
    const value = previewCookieValue(env)!;
    expect(hasPreviewCookie(value, { DISCOVER_PREVIEW_KEY: "a-different-long-private-key-987654" })).toBe(false);
    expect(hasPreviewCookie("nope", env)).toBe(false);
    expect(hasPreviewCookie(undefined, env)).toBe(false);
  });

  it("does not exist when no usable key is configured", () => {
    expect(previewCookieValue({})).toBe(null);
    expect(previewCookieValue({ DISCOVER_PREVIEW_KEY: "short" })).toBe(null);
    expect(hasPreviewCookie("anything", {})).toBe(false);
  });
});
