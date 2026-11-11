import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));

import { disputeState, payoutState, type PayoutInput } from "./bookings";

const now = new Date("2026-11-20T00:00:00Z");
const connected = { payoutMethod: "STRIPE_CONNECT", stripeConnectAccountId: "acct_1", stripePayoutsEnabled: true };
const base: PayoutInput = {
  status: "CONFIRMED", paymentStatus: "PAID", operatorNetCents: 8000, settledAt: null,
  departsAt: new Date("2026-11-10T00:00:00Z"), dispute: "none", operator: connected,
};
const state = (over: Partial<PayoutInput> = {}, settlementOn = true) => payoutState({ ...base, ...over }, { now, settlementOn });

describe("payoutState", () => {
  it("is due at the next run once the trip is over a day old", () => expect(state().label).toBe("Due at the next settlement run"));
  it("warns loudly when it is due but settlement is off", () => expect(state({}, false)).toMatchObject({ tone: "bad" }));
  it("holds money until a day after departure", () => expect(state({ departsAt: new Date("2026-11-19T20:00:00Z") }).label).toMatch(/^Held until 2026-11-20/));
  it("shows paid out", () => expect(state({ settledAt: new Date() }).label).toBe("Paid out"));
  it("pauses on an open dispute, ahead of everything else", () => expect(state({ dispute: "open", settledAt: new Date() }).label).toMatch(/Dispute open/));
  it("blocks on a lost dispute", () => expect(state({ dispute: "lost" }).tone).toBe("bad"));
  it("flags an operator with no payout account", () => expect(state({ operator: { ...connected, stripePayoutsEnabled: false } }).label).toMatch(/no payout account/));
  it("treats a refund as final", () => expect(state({ paymentStatus: "REFUNDED" }).label).toBe("Refunded"));
  it("says nothing is owed when the operator took the money themselves", () => expect(state({ operatorNetCents: 0 }).label).toBe("Nothing owed"));
  it("waits for an unconfirmed booking", () => expect(state({ status: "REQUESTED" }).label).toMatch(/confirm/));
});

describe("disputeState", () => {
  it("none, open, won, lost", () => {
    expect(disputeState(["paid"])).toBe("none");
    expect(disputeState(["dispute_opened"])).toBe("open");
    expect(disputeState(["dispute_opened", "dispute_won"])).toBe("won");
    expect(disputeState(["dispute_opened", "dispute_lost"])).toBe("lost");
  });
});
