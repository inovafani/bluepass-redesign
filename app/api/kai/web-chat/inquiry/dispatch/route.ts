import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dispatchInquiryToOperator } from "@/lib/services/operators/operator-dispatch-service";

const dispatchRequestSchema = z.object({
  inquiryId: z.string().trim().min(1),
  operatorPhone: z.string().trim().min(5).optional(),
  operatorId: z.string().trim().min(1).optional(),
});

export async function POST(request: NextRequest) {
  const serviceToken = request.headers.get("authorization")?.replace("Bearer ", "");

  if (!process.env.INTERNAL_SERVICE_TOKEN || serviceToken !== process.env.INTERNAL_SERVICE_TOKEN) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = dispatchRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "inquiryId is required." }, { status: 400 });
  }

  const operatorPhone =
    parsed.data.operatorPhone?.trim() || process.env.BLUEPASS_TEST_OPERATOR_PHONE?.trim();

  if (!operatorPhone) {
    return NextResponse.json(
      {
        error:
          "operatorPhone is required unless BLUEPASS_TEST_OPERATOR_PHONE is configured.",
      },
      { status: 400 },
    );
  }

  const result = await dispatchInquiryToOperator({
    inquiryId: parsed.data.inquiryId,
    operatorPhone,
    operatorId: parsed.data.operatorId,
  });

  return NextResponse.json({
    ok: true,
    inquiryId: result.inquiryId,
    status: result.status,
    providerMessageId: result.providerMessageId,
  });
}
