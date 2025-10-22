import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongoose";
import { Chat } from "@/models/Chat";
import { callGemini } from "@/lib/gemini";

function createTitleFromMessage(message: string, fallback = "Untitled consultation") {
  const cleaned = message.replace(/\s+/g, " ").trim();
  if (!cleaned) return fallback;
  const words = cleaned.split(" ");
  const selected = words.slice(0, 6).join(" ");
  return selected.length < cleaned.length ? `${selected}…` : selected;
}

export async function GET() {
  const { userId } = auth();

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  await connectToDatabase();
  const chats = await Chat.find({ userId }).sort({ createdAt: -1 }).lean();

  const normalized = chats.map((chat) => ({
    ...chat,
    title: chat.title || createTitleFromMessage(chat.messages?.[0]?.content ?? ""),
  }));

  return NextResponse.json({ chats: normalized });
}

export async function POST(request: Request) {
  const { userId } = auth();

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const body = await request.json();
  const { message, imageBase64, chatId, title } = body as {
    message?: string;
    imageBase64?: string;
    chatId?: string;
    title?: string;
  };

  if (!message || message.trim().length === 0) {
    return new NextResponse("Message is required", { status: 400 });
  }

  await connectToDatabase();

  const assistantReply = await callGemini(message, imageBase64);

  const timestamp = new Date();
  let chat;

  if (chatId) {
    const existing = await Chat.findOne({ _id: chatId, userId });
    if (!existing) {
      return new NextResponse("Consultation not found", { status: 404 });
    }

    const titleToPersist = existing.title?.trim()
      ? existing.title
      : title?.trim() || createTitleFromMessage(message);

    chat = await Chat.findOneAndUpdate(
      { _id: chatId, userId },
      {
        $push: {
          messages: {
            $each: [
              { role: "user", content: message, imageBase64, createdAt: timestamp },
              { role: "assistant", content: assistantReply, createdAt: timestamp },
            ],
          },
        },
        $set: { updatedAt: timestamp, title: titleToPersist },
      },
      { new: true }
    );
  } else {
    chat = await Chat.create({
      userId,
      title: title?.trim() || createTitleFromMessage(message),
      messages: [
        { role: "user", content: message, imageBase64, createdAt: timestamp },
        { role: "assistant", content: assistantReply, createdAt: timestamp },
      ],
    });
  }

  if (!chat) {
    return new NextResponse("Consultation not found", { status: 404 });
  }

  return NextResponse.json({ reply: assistantReply, chat });
}

export async function PATCH(request: Request) {
  const { userId } = auth();

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const body = await request.json();
  const { chatId, title } = body as { chatId?: string; title?: string };

  if (!chatId || !title?.trim()) {
    return new NextResponse("Chat ID and title are required", { status: 400 });
  }

  await connectToDatabase();

  const chat = await Chat.findOneAndUpdate(
    { _id: chatId, userId },
    { $set: { title: title.trim(), updatedAt: new Date() } },
    { new: true }
  );

  if (!chat) {
    return new NextResponse("Consultation not found", { status: 404 });
  }

  return NextResponse.json({ chat });
}

export async function DELETE(request: Request) {
  const { userId } = auth();

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const body = await request.json();
  const { chatId } = body as { chatId?: string };

  if (!chatId) {
    return new NextResponse("Chat ID is required", { status: 400 });
  }

  await connectToDatabase();

  const deleted = await Chat.findOneAndDelete({ _id: chatId, userId });

  if (!deleted) {
    return new NextResponse("Consultation not found", { status: 404 });
  }

  return NextResponse.json({ success: true });
}
