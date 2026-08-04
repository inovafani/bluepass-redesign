import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendTemplateMessage } from "@/lib/services/whatsapp/client";
import { buildOperatorInquiryTemplatePayload } from "@/lib/services/whatsapp/operator-dispatch";

const roleSchema = z.enum(["kai", "ops"]).optional().default("kai");

const noParameterTemplateNameSchema = z.enum(["hello_world", "bluepass_test_message"]);

const noParameterTemplateRequestSchema = z.object({
  to: z.string().min(5),
  role: roleSchema,
  templateName: noParameterTemplateNameSchema,
  languageCode: z.string().min(2).optional().default("en_US"),
});

const bookingInquiryRequestSchema = z.object({
  to: z.string().min(5),
  role: roleSchema,
  templateName: z.literal("booking_inquiry_operator"),
  languageCode: z.string().min(2).optional().default("en"),
  bookingId: z.string().min(1),
  inquiryTitle: z.string().min(1),
  travellerName: z.string().min(1),
  travellerPhone: z.string().min(5),
  dateRange: z.string().min(1),
  guests: z.string().min(1),
  quote: z.string().min(1),
  tripTitle: z.string().min(1),
  notes: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const serviceToken = request.headers.get("authorization")?.replace("Bearer ", "");

  if (!process.env.INTERNAL_SERVICE_TOKEN || serviceToken !== process.env.INTERNAL_SERVICE_TOKEN) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json();
  const templateName = z
    .object({
      templateName: z.enum([
        "hello_world",
        "bluepass_test_message",
        "booking_inquiry_operator",
      ]),
    })
    .parse(body).templateName;

  if (noParameterTemplateNameSchema.safeParse(templateName).success) {
    const payload = noParameterTemplateRequestSchema.parse(body);
    await sendTemplateMessage({
      to: payload.to,
      role: payload.role,
      name: payload.templateName,
      languageCode: payload.languageCode,
    });

    return NextResponse.json({ queued: true });
  }

  const payload = bookingInquiryRequestSchema.parse(body);
  const template = buildOperatorInquiryTemplatePayload(payload);
  await sendTemplateMessage({
    to: template.to,
    role: payload.role,
    name: template.template.name,
    languageCode: payload.languageCode,
    components: template.template.components,
  });

  return NextResponse.json({ queued: true });
}
