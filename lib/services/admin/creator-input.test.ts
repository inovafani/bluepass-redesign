import { describe, expect, it } from "vitest";
import { instagramHandleOf, parseNewCreator, slugify, websiteOf } from "@/lib/services/admin/creator-input";

const form = (fields: Record<string, string | string[]>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) for (const x of Array.isArray(v) ? v : [v]) f.append(k, x);
  return f;
};

describe("parseNewCreator", () => {
  it("needs a name", () => {
    expect(parseNewCreator(form({ website: "reef.com" }))).toEqual({ ok: false, message: "Enter the creator's name." });
  });

  it("needs some way to reach them", () => {
    const r = parseNewCreator(form({ name: "Rae" }));
    expect(r.ok).toBe(false);
  });

  it("tidies website, handle, email, state and specialties", () => {
    const r = parseNewCreator(form({
      name: " Rae Shooter ", website: "reefshooter.com", instagram: "https://www.instagram.com/ReefShooter/", contactEmail: "Rae@ReefShooter.com",
      baseState: "qld", specialties: ["reef", "Dive", "not-a-thing", "reef"],
    }));
    expect(r).toEqual({
      ok: true,
      value: { name: "Rae Shooter", brand: null, website: "https://reefshooter.com/", instagram: "reefshooter", contactEmail: "rae@reefshooter.com", baseState: "QLD", baseTown: null, specialties: ["reef", "dive"], summary: null },
    });
  });

  it("rejects a bad email, website, handle or state", () => {
    expect(parseNewCreator(form({ name: "A", contactEmail: "nope" })).ok).toBe(false);
    expect(parseNewCreator(form({ name: "A", website: "not a site" })).ok).toBe(false);
    expect(parseNewCreator(form({ name: "A", instagram: "bad handle!" })).ok).toBe(false);
    expect(parseNewCreator(form({ name: "A", instagram: "a", baseState: "ZZ" })).ok).toBe(false);
  });
});

describe("helpers", () => {
  it("slugifies and reads handles and sites", () => {
    expect(slugify("Rae  Shooter!")).toBe("rae-shooter");
    expect(slugify("!!!")).toBe("creator");
    expect(instagramHandleOf("@Rae.S")).toBe("rae.s");
    expect(websiteOf("localhost")).toBeNull();
  });
});
