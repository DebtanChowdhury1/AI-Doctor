import { NextResponse } from "next/server";

import ChatModel from "@/models/Chat";
import { requireAuth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongoose";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const { userId } = await requireAuth();
  const { title } = await request.json();
  await connectToDatabase();

  const chat = await ChatModel.findOneAndUpdate(
    { _id: params.id, userId },
    { title },
    { new: true },
  );

  if (!chat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  return NextResponse.json({
    chat: {
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
    },
  });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const { userId } = await requireAuth();
  await connectToDatabase();

  const chat = await ChatModel.findOneAndDelete({ _id: params.id, userId });

  if (!chat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
