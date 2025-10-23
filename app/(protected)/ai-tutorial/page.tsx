import { Suspense } from "react";

import { requireAuth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongoose";
import ChatModel from "@/models/Chat";
import AiTutorialClient from "./client";

export const dynamic = "force-dynamic";

async function loadChats(userId: string) {
  await connectToDatabase();
  const chats = await ChatModel.find({ userId }).sort({ updatedAt: -1 }).lean();

  return chats.map((chat) => ({
    id: chat._id.toString(),
    title: chat.title,
    sourceType: chat.sourceType,
    sourceValue: chat.sourceValue,
    insights: chat.insights,
    followUpPrompt: chat.followUpPrompt,
    messages: chat.messages,
    pdfUrl: chat.pdfUrl,
    updatedAt: chat.updatedAt?.toISOString() ?? new Date().toISOString(),
  }));
}

export default async function AiTutorialPage() {
  const { userId } = await requireAuth();
  const chats = await loadChats(userId);

  return (
    <Suspense>
      <AiTutorialClient initialChats={chats} />
    </Suspense>
  );
}
