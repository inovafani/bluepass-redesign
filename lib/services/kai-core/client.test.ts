import { describe, expect, it, vi } from "vitest";
import {
  listKaiCoreCronRuns,
  listKaiCorePmsBookingLedger,
  settleKaiCorePmsBooking,
} from "./client";

/**
 * Pure fetch-mock tests, following the same shape as rezdy-agent-sync.test.ts's
 * fetchRezdyAgentMarketplaceProducts cases - no database, no live Kai. These functions are the only
 * thing standing between the admin payouts page and a cross-repo HTTP call, so what is asserted here
 * is the contract: the right URL, the admin bearer, and a response mapped without inventing data.
 */
const ENV = {
  KAI_CORE_BASE_URL: "https://kai.example",
  KAI_CORE_ADMIN_TOKEN: "admin-token",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function pmsEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: "led_1",
    kind: "OPERATOR_PAYOUT_PLACEHOLDER",
    amountCents: 45_000,
    currency: "AUD",
    status: "PENDING",
    paidOutAt: null,
    paidOutReference: null,
    paidOutBy: null,
    createdAt: "2026-08-10T00:00:00.000Z",
    pmsBookingPaymentAttemptId: "att_1",
    attempt: {
      productTitle: "Whitsundays Day Sail",
      dateText: "12 Aug 2026",
      guests: 4,
      travellerName: "Jo Traveller",
      externalBookingId: "RZD-991",
      grossAmountCents: 60_000,
      settledAt: null,
    },
    payout: {
      status: "PENDING",
      stripeTransferId: null,
      releasedAt: null,
      releasedBy: null,
      failureReason: null,
    },
    ...overrides,
  };
}

describe("listKaiCorePmsBookingLedger", () => {
  it("calls the tenant's pms-booking-ledger endpoint with the admin bearer and status filter", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ entries: [pmsEntry()] }));

    const entries = await listKaiCorePmsBookingLedger(
      { tenantSlug: "boattime", status: "PENDING" },
      ENV,
      fetchImpl as unknown as typeof fetch,
    );

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://kai.example/api/admin/boattime/pms-booking-ledger?take=100&status=PENDING");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer admin-token");
    expect(init.method).toBe("GET");

    expect(entries).toHaveLength(1);
    // The attempt id is what the settle endpoint is keyed on - losing it makes the row un-actionable.
    expect(entries[0].pmsBookingPaymentAttemptId).toBe("att_1");
    expect(entries[0].attempt?.externalBookingId).toBe("RZD-991");
    expect(entries[0].payout?.status).toBe("PENDING");
  });

  it("url-encodes the tenant slug rather than pasting it into the path", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ entries: [] }));

    await listKaiCorePmsBookingLedger(
      { tenantSlug: "weird/slug" },
      ENV,
      fetchImpl as unknown as typeof fetch,
    );

    const [url] = fetchImpl.mock.calls[0] as unknown as [string];
    expect(url).toContain("/api/admin/weird%2Fslug/pms-booking-ledger");
  });

  it("normalises missing attempt/payout to null instead of leaving them undefined", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ entries: [{ ...pmsEntry(), attempt: undefined, payout: undefined }] }),
    );

    const entries = await listKaiCorePmsBookingLedger(
      { tenantSlug: "boattime" },
      ENV,
      fetchImpl as unknown as typeof fetch,
    );

    expect(entries[0].attempt).toBeNull();
    expect(entries[0].payout).toBeNull();
  });

  it("returns an empty list when the response carries no entries array", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({}));

    await expect(
      listKaiCorePmsBookingLedger({ tenantSlug: "boattime" }, ENV, fetchImpl as unknown as typeof fetch),
    ).resolves.toEqual([]);
  });

  it("throws rather than returning empty when Kai rejects the request", async () => {
    // A 401 must never look like "no payouts pending" - that is the whole failure mode this page exists to remove.
    const fetchImpl = vi.fn(async () => jsonResponse({ error: { code: "ADMIN_TOKEN_REQUIRED" } }, 401));

    await expect(
      listKaiCorePmsBookingLedger({ tenantSlug: "boattime" }, ENV, fetchImpl as unknown as typeof fetch),
    ).rejects.toThrow("Kai Core PMS booking ledger request failed.");
  });

  it("throws when the admin token is not configured", async () => {
    await expect(
      listKaiCorePmsBookingLedger(
        { tenantSlug: "boattime" },
        { KAI_CORE_BASE_URL: "https://kai.example" },
        vi.fn() as unknown as typeof fetch,
      ),
    ).rejects.toThrow("Kai Core admin token is not configured.");
  });
});

describe("listKaiCoreCronRuns", () => {
  it("passes jobName and limit through and returns the runs array", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        runs: [
          {
            id: "run_1",
            jobName: "settle-pms-bookings",
            status: "SUCCESS",
            summary: { released: 2 },
            errorMessage: null,
            startedAt: "2026-08-13T02:00:00.000Z",
            finishedAt: "2026-08-13T02:00:09.000Z",
          },
        ],
      }),
    );

    const runs = await listKaiCoreCronRuns(
      { jobName: "settle-pms-bookings", limit: 5 },
      ENV,
      fetchImpl as unknown as typeof fetch,
    );

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://kai.example/api/admin/cron-runs?jobName=settle-pms-bookings&limit=5");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer admin-token");
    expect(runs[0].jobName).toBe("settle-pms-bookings");
  });

  it("omits the query string entirely when given no filters", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ runs: [] }));

    await listKaiCoreCronRuns({}, ENV, fetchImpl as unknown as typeof fetch);

    const [url] = fetchImpl.mock.calls[0] as unknown as [string];
    expect(url).toBe("https://kai.example/api/admin/cron-runs");
  });

  it("throws when Kai rejects the request", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({}, 401));

    await expect(
      listKaiCoreCronRuns({}, ENV, fetchImpl as unknown as typeof fetch),
    ).rejects.toThrow("Kai Core cron runs request failed.");
  });
});

describe("settleKaiCorePmsBooking", () => {
  it("POSTs to the attempt's settle route with the reviewer email", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ ok: true }));

    await settleKaiCorePmsBooking(
      { tenantSlug: "boattime", attemptId: "att_1", reviewerEmail: "admin@bluepass.co" },
      ENV,
      fetchImpl as unknown as typeof fetch,
    );

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://kai.example/api/admin/boattime/pms-bookings/att_1/settle");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ reviewerEmail: "admin@bluepass.co" });
  });

  it("omits optional payout fields rather than sending empty strings Kai would treat as supplied", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ ok: true }));

    await settleKaiCorePmsBooking(
      {
        tenantSlug: "boattime",
        attemptId: "att_1",
        reviewerEmail: "admin@bluepass.co",
        stripeConnectAccountId: "",
        paidOutReference: "",
      },
      ENV,
      fetchImpl as unknown as typeof fetch,
    );

    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body).not.toHaveProperty("stripeConnectAccountId");
    expect(body).not.toHaveProperty("paidOutReference");
  });

  it("surfaces Kai's own error message when the settle fails", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ error: { code: "SETTLE_FAILED", message: "No Stripe Connect account." } }, 400),
    );

    await expect(
      settleKaiCorePmsBooking(
        { tenantSlug: "boattime", attemptId: "att_1", reviewerEmail: "admin@bluepass.co" },
        ENV,
        fetchImpl as unknown as typeof fetch,
      ),
    ).rejects.toThrow("No Stripe Connect account.");
  });
});
