import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

const db = {
  booking: vi.fn(),
  seen: vi.fn(),
  create: vi.fn(async (_a?: unknown) => ({})),
  profile: vi.fn(),
};
const notify = vi.fn(async (_a?: unknown) => ({ sent: 1 }));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    listingBooking: { findFirst: (a: unknown) => db.booking(a) },
    listingBookingEvent: { findFirst: (a: unknown) => db.seen(a), create: (a: unknown) => db.create(a) },
    operatorProfile: { findUnique: (a: unknown) => db.profile(a) },
  },
}));
vi.mock("@/lib/services/outreach/notify", () => ({ notifyTeam: (a: unknown) => notify(a) }));

import { handlePaymentProblem } from "./payment-problems";

const dispute = (type: string, status = "needs_response") =>
  ({ id: "evt_1", type, livemode: false, data: { object: { id: "dp_1", charge: "ch_1", payment_intent: "pi_1", amount: 12000, currency: "aud", reason: "fraudulent", status, evidence_details: { due_by: 1800000000 } } } }) as unknown as Stripe.Event;

const booking = (settledAt: Date | null = null) => ({ id: "b1", reference: "BP-AAAAAA", settledAt, operatorProfile: { companyName: "Rum Runner" } });

beforeEach(() => {
  Object.values(db).forEach((m) => m.mockReset());
  db.create.mockResolvedValue({});
  notify.mockClear();
});

describe("payment problems", () => {
  it("records an opened dispute once and says the payout is paused", async () => {
    db.booking.mockResolvedValue(booking());
    db.seen.mockResolvedValue(null);
    await handlePaymentProblem(dispute("charge.dispute.created"));
    expect(db.create.mock.calls[0][0]).toMatchObject({ data: { bookingId: "b1", type: "dispute_opened", actor: "stripe" } });
    expect(JSON.stringify(notify.mock.calls[0])).toContain("paused");
  });

  it("does nothing on a replayed event", async () => {
    db.booking.mockResolvedValue(booking());
    db.seen.mockResolvedValue({ id: "e1" });
    await handlePaymentProblem(dispute("charge.dispute.created"));
    expect(db.create).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  it("warns when the operator was already paid", async () => {
    db.booking.mockResolvedValue(booking(new Date()));
    db.seen.mockResolvedValue(null);
    await handlePaymentProblem(dispute("charge.dispute.created"));
    expect(JSON.stringify(notify.mock.calls[0])).toContain("ALREADY been paid");
  });

  it("records a lost dispute as dispute_lost", async () => {
    db.booking.mockResolvedValue(booking());
    db.seen.mockResolvedValue(null);
    await handlePaymentProblem(dispute("charge.dispute.closed", "lost"));
    expect(db.create.mock.calls[0][0]).toMatchObject({ data: { type: "dispute_lost" } });
  });

  it("still alerts when no website booking matches", async () => {
    db.booking.mockResolvedValue(null);
    await handlePaymentProblem(dispute("charge.dispute.created"));
    expect(db.create).not.toHaveBeenCalled();
    expect(JSON.stringify(notify.mock.calls[0])).toContain("no website booking matched");
  });

  it("names the operator whose bank payout failed", async () => {
    db.profile.mockResolvedValue({ companyName: "Rum Runner" });
    const event = { id: "evt_2", type: "payout.failed", livemode: false, account: "acct_x", data: { object: { id: "po_1", amount: 5000, currency: "aud", failure_message: "Account closed" } } } as unknown as Stripe.Event;
    await handlePaymentProblem(event);
    expect(JSON.stringify(notify.mock.calls[0])).toContain("Rum Runner");
    expect(JSON.stringify(notify.mock.calls[0])).toContain("Account closed");
  });

  it("ignores other event types", async () => {
    expect(await handlePaymentProblem({ id: "e", type: "customer.created" } as unknown as Stripe.Event)).toBe(false);
  });
});
