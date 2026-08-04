import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prismaKaiConversationStore } from "@/lib/services/kai/prisma-conversation-store";

const sessionIdSchema = z
  .string()
  .trim()
  .regex(/^kai_[A-Za-z0-9_-]+$/);

export async function GET(request: NextRequest) {
  const sessionId = new URL(request.url).searchParams.get("sessionId");
  const parsedSessionId = sessionIdSchema.safeParse(sessionId);

  if (!parsedSessionId.success) {
    return NextResponse.json(
      { error: "Valid sessionId is required." },
      { status: 400 },
    );
  }

  try {
    const messages = await prismaKaiConversationStore.listMessages?.({
      sessionId: parsedSessionId.data,
      channel: "web",
    });

    return NextResponse.json({
      sessionId: parsedSessionId.data,
      messages: (messages ?? []).map((message) => ({
        role: message.role,
        content: message.content,
        createdAt: message.createdAt?.toISOString(),
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to load chat history." },
      { status: 500 },
    );
  }
}
