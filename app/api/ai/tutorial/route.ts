import { NextResponse } from "next/server";

import { analyzeYouTube, chatWithTutor } from "@/lib/ai/gemini";
import { requireAuth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongoose";
import ChatModel from "@/models/Chat";

function mapChat(chat: any) {
  return {
    id: chat._id.toString(),
    title: chat.title,
    sourceType: chat.sourceType,
    sourceValue: chat.sourceValue,
    insights: chat.insights,
    followUpPrompt: chat.followUpPrompt,
    messages: chat.messages,
    pdfUrl: chat.pdfUrl,
    updatedAt: chat.updatedAt,
    createdAt: chat.createdAt,
  };
}

export async function POST(request: Request) {
  const { userId } = await requireAuth();
  await connectToDatabase();

  const body = await request.json();
  const mode: "analyze" | "message" = body.mode;

  if (mode === "analyze") {
    const { sourceType, sourceValue } = body as { sourceType: "youtube" | "text"; sourceValue: string };

    const analysis = await analyzeYouTube({
      url: sourceType === "youtube" ? sourceValue : undefined,
      topic: sourceType === "text" ? sourceValue : undefined,
    });

    const chat = await ChatModel.create({
      userId,
      title: analysis.title,
      sourceType,
      sourceValue,
      insights: [...(analysis.insights ?? []), ...(analysis.recommendations ?? [])],
      followUpPrompt: analysis.followUpPrompt,
      messages: [
        {
          role: "assistant",
          content: `${analysis.overview}\n\nKey Insights:\n${analysis.insights.map((item, index) => `${index + 1}. ${item}`).join("\n")}`,
          citations: [],
        },
      ],
    });

    return NextResponse.json({ chat: mapChat(chat) });
  }

  if (mode === "message") {
    const { chatId, message } = body as { chatId: string; message: string };
    const chat = await ChatModel.findOne({ _id: chatId, userId });

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    chat.messages.push({ role: "user", content: message, citations: [] });

    const assistant = await chatWithTutor({
      context: chat.title,
      transcript: chat.sourceValue,
      history: chat.messages.map((m: any) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
      message,
    });

    chat.messages.push({ role: "assistant", content: assistant.reply, citations: assistant.citations });
    await chat.save();

    return NextResponse.json({ chat: mapChat(chat) });
  }

  return NextResponse.json({ error: "Unsupported mode" }, { status: 400 });
}
