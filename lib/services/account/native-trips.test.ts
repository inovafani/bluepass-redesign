import { describe, expect, it } from "vitest";
import { nativeTripsFrom } from "./native-trips";

function row(over: Record<string, unknown> = {}) {
  return {
    id: "b1", reference: "BP-MTMN4T", status: "CONFIRMED", paymentStatus: "PAID",
    departsAt: new Date("2026-11-11T22:00:00.000Z"), timezone: "Australia/Brisbane", guests: 2,
    totalCents: 20_000, currency: "AUD", conservationCents: 1_000, guestToken: "tok_abc",
    cancelledAt: null, createdAt: new Date("2026-11-10T08:14:14.000Z"),
    listing: { title: "Testing Trip 2", operatorProfile: { companyName: "Dummy Marine Tours (test)" } },
    ...over,
  };
}

describe("nativeTripsFrom", () => {
  it("maps a paid booking to a trip that links to its own page", () => {
    const { trips } = nativeTripsFrom([row()]);
    expect(trips[0]).toMatchObject({
      kind: "native-booking", title: "Testing Trip 2", status: "CONFIRMED", reference: "BP-MTMN4T",
      operator: "Dummy Marine Tours (test)", amount: expect.stringContaining("200"), href: "/trip/tok_abc",
    });
    expect(trips[0].dateText).toContain("12 November 2026");
  });

  it("counts the reef 5% only for money Bluepass took and did not give back", () => {
    const { conservation } = nativeTripsFrom([
      row(),
      row({ id: "b2", conservationCents: 500 }),
      row({ id: "b3", status: "CANCELLED" }),
      row({ id: "b4", paymentStatus: "PAID_TO_OPERATOR" }),
    ]);
    expect(conservation).toEqual([{ currency: "AUD", amountCents: 1_500 }]);
  });

  it("leaves href out when a booking has no guest token", () => {
    expect(nativeTripsFrom([row({ guestToken: null })]).trips[0].href).toBeUndefined();
  });
});
