import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db/prisma";
import type { KaiCoreBluePassLedgerEntry } from "@/lib/services/kai-core/client";
import type { RezdyAgentManualInquiry } from "@/lib/services/discover/rezdy-agent-sync";
import {
  loadOperatorBookings,
  loadOperatorListings,
  operatorBookingSource,
} from "./dashboard";

/** A stand-in for `loadOperatorBookings`'s third param, the same way `fakeLedger` stands in for the second. */
function fakeManualInquiries(rows: (productExternalIds: string[]) => RezdyAgentManualInquiry[]) {
  return vi.fn(async (productExternalIds: string[]) => rows(productExternalIds));
}

function inquiry(overrides: Partial<RezdyAgentManualInquiry> = {}): RezdyAgentManualInquiry {
  return {
    id: `inq_${randomUUID()}`,
    status: "OPEN",
    productExternalId: "AGT-1",
    productTitle: "Reef Trip",
    dateText: "Saturday",
    guests: 2,
    travellerName: "Alex",
    travellerEmail: "alex@example.test",
    travellerPhone: null,
    travellerMessage: "I'd like to book this.",
    createdAt: "2026-08-25T00:00:00.000Z",
    ...overrides,
  };
}

/**
 * The listings cases use real rows behind the usual prefix; the bookings cases inject a fake ledger
 * loader, the same way rezdy-agent-sync.test.ts injects a `fetchImpl` rather than reaching Kai.
 */
const EMAIL_PREFIX = "operator-dashboard-test+";

afterAll(async () => {
  const accounts = await prisma.bluePassAccount.findMany({
    where: { email: { startsWith: EMAIL_PREFIX } },
    select: { id: true },
  });
  await prisma.bluePassAccount.deleteMany({ where: { id: { in: accounts.map((a) => a.id) } } });
});

/** The shape `listKaiCoreBluePassLedger` is called with, so the fake's calls can be asserted. */
type LedgerCall = { tenantSlug: string; status?: "PENDING" | "FINALIZED" | "VOIDED" };

function fakeLedger(rows: (call: LedgerCall) => KaiCoreBluePassLedgerEntry[]) {
  return vi.fn(async (input: LedgerCall) => rows(input));
}

function entry(overrides: Partial<KaiCoreBluePassLedgerEntry> = {}): KaiCoreBluePassLedgerEntry {
  return {
    id: `led_${randomUUID()}`,
    kind: "OPERATOR_PAYOUT_PLACEHOLDER",
    amountCents: 1_250_000,
    currency: "IDR",
    status: "PENDING",
    paidOutAt: null,
    paidOutReference: null,
    paidOutBy: null,
    createdAt: "2026-08-11T00:00:00.000Z",
    inquiry: {
      id: "inq_1",
      selectedYachtName: "Ocean Pearl",
      operatorName: "Komodo Charters",
      operatorPhone: "+6281100011",
      destination: "Labuan Bajo",
      status: "CONFIRMED",
    },
    ...overrides,
  };
}

describe("operatorBookingSource", () => {
  it("reads a Kai tenant slug as the operator's own ledger", () => {
    expect(operatorBookingSource({ kaiTenantSlug: "boattime", rezdySupplierId: null })).toEqual({
      kind: "kai-tenant",
      tenantSlug: "boattime",
    });
  });

  it("reads a Rezdy supplier id as a source with no per-operator lookup", () => {
    expect(operatorBookingSource({ kaiTenantSlug: null, rezdySupplierId: "SUP-1" })).toEqual({
      kind: "rezdy-agent",
      rezdySupplierId: "SUP-1",
    });
  });

  it("reads neither as unlinked", () => {
    expect(operatorBookingSource({ kaiTenantSlug: null, rezdySupplierId: null })).toEqual({
      kind: "unlinked",
    });
  });

  it("prefers the Kai tenant when a profile carries both", () => {
    expect(operatorBookingSource({ kaiTenantSlug: "boattime", rezdySupplierId: "SUP-1" })).toEqual({
      kind: "kai-tenant",
      tenantSlug: "boattime",
    });
  });
});

describe("loadOperatorBookings", () => {
  it("queries only the operator's own tenant, across every status", async () => {
    const listLedger = fakeLedger(() => [entry()]);

    const bookings = await loadOperatorBookings(
      { id: "does-not-matter-for-kai-tenant", kaiTenantSlug: "operator-dashboard-test", rezdySupplierId: null },
      listLedger,
    );

    expect(bookings.kind).toBe("kai-tenant");
    /* Kai's endpoint defaults to FINALIZED when given no status, so "everything" has to be three
       explicit calls — one omitted parameter here would silently hide every pending payout. */
    expect(listLedger.mock.calls.map(([call]) => call.status).sort()).toEqual([
      "FINALIZED",
      "PENDING",
      "VOIDED",
    ]);
    for (const [call] of listLedger.mock.calls) {
      expect(call.tenantSlug).toBe("operator-dashboard-test");
    }
  });

  it("shapes rows with the shared normaliser but strips the admin-only payout action", async () => {
    const listLedger = fakeLedger(({ status }) => (status === "PENDING" ? [entry()] : []));

    const bookings = await loadOperatorBookings(
      { id: "does-not-matter-for-kai-tenant", kaiTenantSlug: "operator-dashboard-test", rezdySupplierId: null },
      listLedger,
    );

    if (bookings.kind !== "kai-tenant" || !bookings.result.ok) throw new Error("expected rows");
    expect(bookings.result.data).toHaveLength(1);
    const [row] = bookings.result.data;
    expect(row.title).toBe("Ocean Pearl");
    expect(row.amountCents).toBe(1_250_000);
    /* toIndonesiaLedgerRow would offer a release action for this row. An operator must never be
       handed a money-moving button — the action behind it is admin-gated and could only refuse. */
    expect(row.action).toBeNull();
  });

  it("reports an unreachable Kai as a failure rather than as an empty history", async () => {
    const listLedger = fakeLedger(() => {
      throw new Error("Kai Core BluePass ledger request failed.");
    });

    const bookings = await loadOperatorBookings(
      { id: "does-not-matter-for-kai-tenant", kaiTenantSlug: "operator-dashboard-test", rezdySupplierId: null },
      listLedger,
    );

    if (bookings.kind !== "kai-tenant") throw new Error("expected the kai-tenant branch");
    expect(bookings.result.ok).toBe(false);
    if (bookings.result.ok) return;
    expect(bookings.result.message).toContain("ledger request failed");
  });

  it("never calls the ledger for a Rezdy-Agent operator, and asks Kai for this operator's own product ids", async () => {
    const listLedger = fakeLedger(() => [entry()]);
    const listManualInquiries = fakeManualInquiries(() => [inquiry()]);
    const operatorProfileId = await operatorProfile();
    await prisma.operatorListing.createMany({
      data: [
        listing(operatorProfileId, { title: "Reef Trip", externalProductId: "AGT-1" }),
        listing(operatorProfileId, { title: "Sunset Sail", externalProductId: "AGT-2" }),
        listing(operatorProfileId, { title: "Draft With No Product Id Yet" }),
      ],
    });

    const bookings = await loadOperatorBookings(
      { id: operatorProfileId, kaiTenantSlug: null, rezdySupplierId: "SUP-42" },
      listLedger,
      listManualInquiries,
    );

    expect(listLedger).not.toHaveBeenCalled();
    expect(listManualInquiries).toHaveBeenCalledTimes(1);
    const [calledWith] = listManualInquiries.mock.calls[0];
    expect(calledWith.sort()).toEqual(["AGT-1", "AGT-2"]);

    if (bookings.kind !== "rezdy-agent" || !bookings.result.ok) throw new Error("expected inquiry rows");
    expect(bookings.rezdySupplierId).toBe("SUP-42");
    expect(bookings.result.data).toHaveLength(1);
  });

  it("asks Kai for an empty product id list rather than erroring when no listing has one yet", async () => {
    const listLedger = fakeLedger(() => []);
    const listManualInquiries = fakeManualInquiries(() => []);
    const operatorProfileId = await operatorProfile();
    await prisma.operatorListing.create({ data: listing(operatorProfileId, { title: "No Product Id" }) });

    const bookings = await loadOperatorBookings(
      { id: operatorProfileId, kaiTenantSlug: null, rezdySupplierId: "SUP-43" },
      listLedger,
      listManualInquiries,
    );

    expect(listManualInquiries).toHaveBeenCalledWith([]);
    if (bookings.kind !== "rezdy-agent" || !bookings.result.ok) throw new Error("expected an ok, empty result");
    expect(bookings.result.data).toEqual([]);
  });

  it("reports an unreachable Kai as a failure for a Rezdy-Agent operator too, not an empty history", async () => {
    const listLedger = fakeLedger(() => []);
    const listManualInquiries = fakeManualInquiries(() => {
      throw new Error("Kai manual-inquiries request failed with status 502.");
    });
    const operatorProfileId = await operatorProfile();

    const bookings = await loadOperatorBookings(
      { id: operatorProfileId, kaiTenantSlug: null, rezdySupplierId: "SUP-44" },
      listLedger,
      listManualInquiries,
    );

    if (bookings.kind !== "rezdy-agent") throw new Error("expected the rezdy-agent branch");
    expect(bookings.result.ok).toBe(false);
    if (bookings.result.ok) return;
    expect(bookings.result.message).toContain("manual-inquiries request failed");
  });

  it("never calls Kai at all for an operator with no booking source", async () => {
    const listLedger = fakeLedger(() => [entry()]);
    const listManualInquiries = fakeManualInquiries(() => [inquiry()]);

    const bookings = await loadOperatorBookings(
      { id: "does-not-matter-for-unlinked", kaiTenantSlug: null, rezdySupplierId: null },
      listLedger,
      listManualInquiries,
    );

    expect(bookings).toEqual({ kind: "unlinked" });
    expect(listLedger).not.toHaveBeenCalled();
    expect(listManualInquiries).not.toHaveBeenCalled();
  });
});

describe("loadOperatorListings", () => {
  it("returns only this operator's listings, archived ones included", async () => {
    const [mine, theirs] = await Promise.all([operatorProfile(), operatorProfile()]);

    await prisma.operatorListing.createMany({
      data: [
        listing(mine, { title: "Dashboard Test Live", status: "LIVE", priceSignal: "From AUD 189" }),
        listing(mine, { title: "Dashboard Test Archived", status: "ARCHIVED" }),
        listing(theirs, { title: "Dashboard Test Someone Else" }),
      ],
    });

    const rows = await loadOperatorListings(mine);

    expect(rows.map((row) => row.title).sort()).toEqual([
      "Dashboard Test Archived",
      "Dashboard Test Live",
    ]);
    const live = rows.find((row) => row.status === "LIVE");
    expect(live?.priceSignal).toBe("From AUD 189");
    /* A listing with no price signal reports null rather than a zero — the page turns that into
       "no price shown" instead of putting a number on screen that nobody chose. */
    expect(rows.find((row) => row.status === "ARCHIVED")?.priceSignal).toBeNull();
  });

  it("returns nothing for an operator with no listings", async () => {
    expect(await loadOperatorListings(await operatorProfile())).toEqual([]);
  });
});

async function operatorProfile() {
  const profile = await prisma.operatorProfile.create({
    data: {
      status: "LIVE",
      companyName: `Dashboard Test ${randomUUID()}`,
      account: {
        create: {
          email: `${EMAIL_PREFIX}${randomUUID()}@ops.bluepass.co`,
          passwordHash: "unusable-placeholder",
          roles: ["OPERATOR"],
        },
      },
    },
    select: { id: true },
  });

  return profile.id;
}

function listing(
  operatorProfileId: string,
  overrides: {
    title: string;
    status?: "DRAFT" | "LIVE" | "ARCHIVED";
    priceSignal?: string;
    externalProductId?: string;
  },
) {
  return {
    operatorProfileId,
    title: overrides.title,
    slug: `dashboard-test-${randomUUID()}`,
    category: "Sailing",
    region: "Whitsundays",
    description: "A test listing.",
    status: overrides.status ?? "DRAFT",
    priceSignal: overrides.priceSignal ?? null,
    externalProductId: overrides.externalProductId ?? null,
  };
}
