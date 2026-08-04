import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getCurrentTraveller } from "@/lib/services/auth/session";
import { encryptCredentials } from "@/lib/services/booking/adapters/credentials";
import {
  syncBokunCatalog,
  validateBokunCredentials,
} from "@/lib/services/booking/adapters/bokun-sync";
import {
  operatorPmsReadinessSchema,
  submitOperatorPmsReadiness,
} from "@/lib/services/operators/operator-pms-readiness";

const optionalPublicBookingUrl = z
  .string()
  .trim()
  .refine((value) => !value || /^https:\/\/\S+$/i.test(value), {
    message: "Public booking URLs must use https.",
  })
  .optional();

const integrationSchema = z.object({
  operatorId: z.string().trim().optional(),
  platform: z.enum(["REZDY", "FAREHARBOR", "BOKUN", "NATIVE"]),
  contactEmail: z.string().trim().email().optional().or(z.literal("")),
  contactWhatsapp: z.string().trim().max(40).optional().or(z.literal("")),
  notes: z.string().trim().max(1200).optional().or(z.literal("")),
  credentials: z
    .object({
      apiBase: z.string().trim().url().optional().or(z.literal("")),
      accessToken: z.string().trim().optional(),
      supplierId: z.string().trim().optional(),
      publicBookingBaseUrl: optionalPublicBookingUrl,
      publicProductUrlTemplate: optionalPublicBookingUrl,
      restApiBase: z.string().trim().url().optional().or(z.literal("")),
      restAccessKey: z.string().trim().optional(),
      restSecretKey: z.string().trim().optional(),
    })
    .default({}),
});

export async function POST(request: NextRequest) {
  const body: unknown = await request.json();
  const parsed = integrationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please check the integration fields and try again." },
      { status: 400 },
    );
  }

  const { operatorId, platform, credentials } = parsed.data;

  if (!operatorId) {
    const currentTraveller = await getCurrentTraveller();

    if (!currentTraveller?.accountId) {
      return NextResponse.json(
        { error: "Please sign in with your operator account first." },
        { status: 401 },
      );
    }

    const readinessParsed = operatorPmsReadinessSchema.safeParse({
      platform,
      contactEmail: parsed.data.contactEmail,
      contactWhatsapp: parsed.data.contactWhatsapp,
      notes: parsed.data.notes,
    });

    if (!readinessParsed.success) {
      return NextResponse.json(
        { error: "Please check the PMS setup fields and try again." },
        { status: 400 },
      );
    }

    const readiness = await submitOperatorPmsReadiness({
      ...readinessParsed.data,
      accountId: currentTraveller.accountId,
    });

    return NextResponse.json({ ok: true, readiness, sync: null });
  }

  const operator = await prisma.operator.findUnique({
    where: { id: operatorId },
    select: { id: true },
  });

  if (!operator) {
    return NextResponse.json({ error: "Operator was not found." }, { status: 404 });
  }

  if (platform === "BOKUN") {
    if (!credentials.accessToken) {
      return NextResponse.json(
        { error: "Bokun access token is required." },
        { status: 400 },
      );
    }

    const bokunCredentials = {
      apiBase: credentials.apiBase || undefined,
      accessToken: credentials.accessToken,
      supplierId: credentials.supplierId || undefined,
      publicBookingBaseUrl: credentials.publicBookingBaseUrl || undefined,
      publicProductUrlTemplate: credentials.publicProductUrlTemplate || undefined,
      restApiBase: credentials.restApiBase || undefined,
      restAccessKey: credentials.restAccessKey || undefined,
      restSecretKey: credentials.restSecretKey || undefined,
    };

    await validateBokunCredentials(bokunCredentials);

    const integration = await prisma.operatorIntegration.upsert({
      where: {
        operatorId_platform: {
          operatorId,
          platform,
        },
      },
      update: {
        encryptedCredentials: encryptCredentials(bokunCredentials),
      },
      create: {
        operatorId,
        platform,
        encryptedCredentials: encryptCredentials(bokunCredentials),
      },
      select: { id: true, platform: true, updatedAt: true },
    });
    const sync = await syncBokunCatalog(operatorId, bokunCredentials);

    return NextResponse.json({ ok: true, integration, sync });
  }

  const integration = await prisma.operatorIntegration.upsert({
    where: {
      operatorId_platform: {
        operatorId,
        platform,
      },
    },
    update: {
      encryptedCredentials: encryptCredentials(credentials),
    },
    create: {
      operatorId,
      platform,
      encryptedCredentials: encryptCredentials(credentials),
    },
    select: { id: true, platform: true, updatedAt: true },
  });

  return NextResponse.json({ ok: true, integration, sync: null });
}
