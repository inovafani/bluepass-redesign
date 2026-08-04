import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { yachtBySlug } from "@/lib/data/yachts";
import { createInquiryFromKaiSession } from "@/lib/services/booking/booking-inquiry-service";
import { dispatchInquiryToOperator } from "@/lib/services/operators/operator-dispatch-service";

const inquiryRequestSchema = z.object({
  sessionId: z
    .string()
    .trim()
    .regex(/^kai_[A-Za-z0-9_-]+$/),
  selectedYachtSlug: z.string().trim().min(1).optional(),
  confirm: z.literal(true),
});

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = inquiryRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "sessionId, selectedYachtSlug, and confirm=true are required." },
      { status: 400 },
    );
  }

  if (
    parsed.data.selectedYachtSlug &&
    !yachtBySlug[parsed.data.selectedYachtSlug]
  ) {
    return NextResponse.json(
      {
        ok: false,
        missingSlots: ["selectedYachtSlug"],
        error: "Selected yacht was not found in the BluePass preview catalog.",
      },
      { status: 400 },
    );
  }

  const result = await createInquiryFromKaiSession({
    sessionId: parsed.data.sessionId,
    selectedYachtSlug: parsed.data.selectedYachtSlug,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        missingSlots: result.missingSlots,
        ...(result.error ? { error: result.error } : {}),
      },
      { status: result.missingSlots.includes("sessionId") ? 404 : 200 },
    );
  }

  const operatorPhone = process.env.BLUEPASS_TEST_OPERATOR_PHONE?.trim();

  if (!operatorPhone) {
    return NextResponse.json({
      ok: true,
      dispatched: false,
      inquiryId: result.inquiry.id,
      status: result.inquiry.status,
      selectedYachtSlug: result.inquiry.selectedYachtSlug,
      missingSlots: [],
      error: "Operator dispatch phone is not configured.",
    });
  }

  const dispatch = await dispatchInquiryToOperator({
    inquiryId: result.inquiry.id,
    operatorPhone,
  }).catch((error: unknown) => {
    console.warn("kai.web_chat.inquiry.dispatch_failed", {
      inquiryId: result.inquiry.id,
      errorName: error instanceof Error ? error.name : "UnknownError",
      message:
        error instanceof Error ? error.message : "Unable to dispatch inquiry",
    });

    return undefined;
  });

  if (!dispatch) {
    return NextResponse.json(
      {
        ok: true,
        dispatched: false,
        inquiryId: result.inquiry.id,
        status: result.inquiry.status,
        selectedYachtSlug: result.inquiry.selectedYachtSlug,
        missingSlots: [],
        error: "Inquiry was created, but operator dispatch failed.",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    dispatched: true,
    inquiryId: result.inquiry.id,
    status: dispatch.status,
    selectedYachtSlug: result.inquiry.selectedYachtSlug,
    providerMessageId: dispatch.providerMessageId,
    missingSlots: [],
  });
}
