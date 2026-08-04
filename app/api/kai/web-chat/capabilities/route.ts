import { NextRequest, NextResponse } from "next/server";
import { getKaiCoreWidgetCapabilities } from "@/lib/services/kai-core/client";

export async function GET(request: NextRequest) {
  const regionParam = request.nextUrl.searchParams.get("region");
  const region = regionParam === "australia" || regionParam === "indonesia" ? regionParam : undefined;

  try {
    const capabilities = await getKaiCoreWidgetCapabilities({ region });

    return NextResponse.json(capabilities);
  } catch (error) {
    console.warn("kai.web_chat.capabilities_failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : "Unable to fetch widget capabilities",
    });

    return NextResponse.json({ enabledFeatures: [] });
  }
}
