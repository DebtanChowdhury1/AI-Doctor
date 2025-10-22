import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import { connectToDatabase } from "@/lib/mongoose";
import { Chat } from "@/models/Chat";
import { callGemini } from "@/lib/gemini";

export async function GET() {
  const { userId } = auth();

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  await connectToDatabase();
  const chats = await Chat.find({ userId }).sort({ createdAt: -1 }).lean();

  return NextResponse.json({ chats });
}

export async function POST(request: Request) {
  const { userId } = auth();

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const body = await request.json();
  const { message, imageBase64 } = body as { message?: string; imageBase64?: string };

  if (!message || message.trim().length === 0) {
    return new NextResponse("Message is required", { status: 400 });
  }

  await connectToDatabase();

  const assistantReply = await callGemini(message, imageBase64);

  const chat = await Chat.findOneAndUpdate(
    { userId },
    {
      $push: {
        messages: {
          $each: [
            { role: "user", content: message, imageBase64, createdAt: new Date() },
            { role: "assistant", content: assistantReply, createdAt: new Date() },
          ],
        },
      },
    },
    { new: true, upsert: true }
  );

  return NextResponse.json({ reply: assistantReply, chat });
}
