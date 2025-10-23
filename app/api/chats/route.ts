import { NextResponse } from "next/server";

import ChatModel from "@/models/Chat";
import { requireAuth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongoose";

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

export async function GET() {
  const { userId } = await requireAuth();
  await connectToDatabase();
  const chats = await ChatModel.find({ userId }).sort({ updatedAt: -1 });
  return NextResponse.json({ chats: chats.map(mapChat) });
}
