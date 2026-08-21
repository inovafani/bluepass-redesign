import { describe, expect, it, vi } from "vitest";
import { formatMoneyFromCents } from "@/lib/services/admin/payouts";
import { listKaiCoreTravellerBookings } from "@/lib/services/kai-core/client";
import { formatTravellerConservation, loadTravellerTrips, mergeTravellerTrips } from "./traveller-bookings";

/**
 * No database and no live Kai, matching kai-core/client.test.ts: the merge is pure, and the client
 * call is asserted against an injected fetch. What matters here is the contract with Kai (URL,
 * bearer, no invented data) and the one thing the page depends on that Kai does not do for us —
 * interleaving two separately-sorted lists into one.
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

function auBooking(overrides: Record<string, unknown> = {}) {
  return {
    id: "att_1",
    conversationId: "conv_1",
    productTitle: "Gold Coast Whale Escape",
    dateText: "14 Sep 2026",
    guests: 2,
    grossAmountCents: 32_000,
    currency: "AUD",
    status: "AWAITING_PAYMENT",
    externalBookingId: "RZD-100",
    settledAt: null,
    cancelledAt: null,
    createdAt: "2026-08-12T00:00:00.000Z",
    tenant: { slug: "bluepass-au", name: "Boattime Yacht Charters" },
    ...overrides,
  };
}

function inquiry(overrides: Record<string, unknown> = {}) {
  return {
    id: "inq_1",
    conversationId: "conv_2",
    status: "NEW",
    destination: "Labuan Bajo",
    selectedYachtName: "Ocean Pearl",
    operatorName: "Komodo Charters",
    dateWindow: "Oct 2026",
    guests: 6,
    createdAt: "2026-08-14T00:00:00.000Z",
    tenant: { slug: "bluepass", name: "BluePass" },
    ...overrides,
  };
}

describe("listKaiCoreTravellerBookings", () => {
  it("calls the traveller-scoped admin endpoint with the account id and bearer token", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ auBookings: [auBooking()], indonesiaInquiries: [inquiry()] }),
    );

    const result = await listKaiCoreTravellerBookings(
      { travellerAccountId: "acct_123" },
      ENV,
      fetchImpl as unknown as typeof fetch,
    );

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://kai.example/api/admin/traveller-bookings?travellerAccountId=acct_123");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer admin-token");
    expect(init.method).toBe("GET");
    expect(result.auBookings).toHaveLength(1);
    expect(result.indonesiaInquiries).toHaveLength(1);
  });

  it("throws without an admin token rather than calling Kai unauthenticated", async () => {
    const fetchImpl = vi.fn();

    await expect(
      listKaiCoreTravellerBookings(
        { travellerAccountId: "acct_123" },
        { KAI_CORE_BASE_URL: "https://kai.example" },
        fetchImpl as unknown as typeof fetch,
      ),
    ).rejects.toThrow(/admin token/i);

    expect(fetchImpl).not.toHaveBeenCalled();
  });

  /**
   * A rejected token is the realistic failure — a stale `KAI_CORE_ADMIN_TOKEN` against Kai's
   * `KAI_ADMIN_TOKEN`. It must throw rather than return an empty history, which the page would
   * otherwise render as "you have no trips".
   */
  it("throws on a 401 instead of returning an empty history", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ error: { code: "ADMIN_TOKEN_REQUIRED" } }, 401),
    );

    await expect(
      listKaiCoreTravellerBookings(
        { travellerAccountId: "acct_123" },
        ENV,
        fetchImpl as unknown as typeof fetch,
      ),
    ).rejects.toThrow(/traveller bookings request failed/i);

    // 4xx is not retried: a rejected token will be rejected again.
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("retries a 5xx once before giving up, and still never returns an empty history", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ error: "boom" }, 500));

    await expect(
      listKaiCoreTravellerBookings(
        { travellerAccountId: "acct_123" },
        ENV,
        fetchImpl as unknown as typeof fetch,
      ),
    ).rejects.toThrow(/Kai Core returned 500/);

    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("defaults missing lists to empty on an otherwise successful response", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({}));

    const result = await listKaiCoreTravellerBookings(
      { travellerAccountId: "acct_123" },
      ENV,
      fetchImpl as unknown as typeof fetch,
    );

    expect(result).toEqual({ auBookings: [], indonesiaInquiries: [], conservationByCurrency: [] });
  });
});

describe("mergeTravellerTrips", () => {
  it("interleaves both regions newest-first rather than grouping by region", () => {
    const trips = mergeTravellerTrips({
      auBookings: [
        auBooking({ id: "au_old", createdAt: "2026-08-01T00:00:00.000Z" }),
        auBooking({ id: "au_new", createdAt: "2026-08-20T00:00:00.000Z" }),
      ],
      indonesiaInquiries: [inquiry({ id: "id_mid", createdAt: "2026-08-10T00:00:00.000Z" })],
    });

    expect(trips.map((trip) => trip.id)).toEqual(["au_new", "id_mid", "au_old"]);
  });

  it("formats AU money through the shared formatter and leaves an inquiry priceless", () => {
    const trips = mergeTravellerTrips({
      auBookings: [auBooking({ grossAmountCents: 32_000, currency: "AUD" })],
      indonesiaInquiries: [inquiry()],
    });

    const au = trips.find((trip) => trip.kind === "au-booking");
    const id = trips.find((trip) => trip.kind === "indonesia-inquiry");

    expect(au?.amount).toContain("320");
    expect(au?.amount).toContain("AUD");
    // An inquiry has no agreed price, so inventing one (even "AUD 0.00") would be a fabricated fact.
    expect(id?.amount).toBeNull();
  });

  it("names an AU trip by its product and an inquiry by its yacht", () => {
    const trips = mergeTravellerTrips({
      auBookings: [auBooking()],
      indonesiaInquiries: [inquiry()],
    });

    expect(trips.find((t) => t.kind === "au-booking")?.title).toBe("Gold Coast Whale Escape");
    expect(trips.find((t) => t.kind === "indonesia-inquiry")?.title).toBe("Ocean Pearl");
  });

  it("falls back to the destination, then a plain label, for an unnamed inquiry", () => {
    const [withDestination] = mergeTravellerTrips({
      auBookings: [],
      indonesiaInquiries: [inquiry({ selectedYachtName: null })],
    });
    expect(withDestination.title).toBe("Labuan Bajo");

    const [bare] = mergeTravellerTrips({
      auBookings: [],
      indonesiaInquiries: [inquiry({ selectedYachtName: null, destination: null })],
    });
    expect(bare.title).toBe("Trip enquiry");
  });

  it("prefers the operator's own name over the tenant's for an inquiry", () => {
    const [trip] = mergeTravellerTrips({
      auBookings: [],
      indonesiaInquiries: [inquiry({ operatorName: "Komodo Charters" })],
    });

    expect(trip.operator).toBe("Komodo Charters");
  });

  it("returns nothing for a traveller with no history", () => {
    expect(mergeTravellerTrips({ auBookings: [], indonesiaInquiries: [] })).toEqual([]);
  });
});

describe("formatTravellerConservation", () => {
  it("returns nothing when Kai reports no contribution", () => {
    expect(formatTravellerConservation({ conservationByCurrency: [] })).toEqual([]);
  });

  it("formats each currency Kai already sorted, without inventing an order of its own", () => {
    const result = formatTravellerConservation({
      conservationByCurrency: [
        { currency: "AUD", amountCents: 795 },
        { currency: "USD", amountCents: 250 },
      ],
    });

    expect(result).toEqual([
      { currency: "AUD", amount: formatMoneyFromCents(795, "AUD") },
      { currency: "USD", amount: formatMoneyFromCents(250, "USD") },
    ]);
  });
});

describe("loadTravellerTrips", () => {
  /**
   * The distinction the page is built on. An unreachable Kai has to arrive as `ok: false`, because
   * the alternative — an empty array — renders as "you have no trips" to someone who has really
   * booked one.
   */
  it("reports a Kai failure as a failed section, not an empty history", async () => {
    vi.stubEnv("KAI_CORE_ADMIN_TOKEN", "");

    const result = await loadTravellerTrips("acct_123");

    expect(result.ok).toBe(false);
    vi.unstubAllEnvs();
  });
});
