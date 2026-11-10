import { describe, expect, it } from "vitest";
import { buildSiteJsonLd, INSTAGRAM_URL } from "./site-jsonld";

describe("buildSiteJsonLd", () => {
  it("describes one Organization and one WebSite that points back at it", () => {
    const graph = buildSiteJsonLd()["@graph"];
    const org = graph.find((n) => n["@type"] === "Organization")!;
    const site = graph.find((n) => n["@type"] === "WebSite")!;
    expect(org.sameAs).toEqual([INSTAGRAM_URL]);
    expect((site.publisher as { "@id": string })["@id"]).toBe(org["@id"]);
  });

  it("uses the same Organization id as the blog's article markup", () => {
    expect(buildSiteJsonLd()["@graph"][0]["@id"]).toMatch(/\/#organization$/);
  });
});
