import { NextResponse } from "next/server";

import ChatModel from "@/models/Chat";
import { requireAuth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongoose";
import { formatChatPdf, generatePDF } from "@/lib/ai/gemini";
import { uploadPdf } from "@/lib/cloudinary";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const { userId } = await requireAuth();
  await connectToDatabase();
  const chat = await ChatModel.findOne({ _id: params.id, userId });

  if (!chat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  const pdfBuffer = await generatePDF(
    formatChatPdf({
      title: chat.title,
      insights: chat.insights,
      history: chat.messages,
    }),
  );

  const url = await uploadPdf(pdfBuffer, `chat-${chat._id}`);
  chat.pdfUrl = url;
  await chat.save();

  return NextResponse.json({ url });
}
