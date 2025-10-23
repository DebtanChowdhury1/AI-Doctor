import { NextResponse } from "next/server";

import { summarizeText } from "@/lib/ai/gemini";
import { requireAuth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongoose";
import SummaryModel from "@/models/Summary";

export async function POST(request: Request) {
  const { userId } = await requireAuth();
  const { text, source } = await request.json();

  if (!text) {
    return NextResponse.json({ error: "Text is required" }, { status: 400 });
  }

  await connectToDatabase();
  const summary = await summarizeText(text);

  const record = await SummaryModel.create({
    userId,
    source: source ?? "Custom",
    originalText: text,
    summary: summary.summary,
    keyPoints: summary.keyPoints,
    quiz: summary.quiz,
  });

  return NextResponse.json({
    summary: {
      id: record._id.toString(),
      source: record.source,
      originalText: record.originalText,
      summary: record.summary,
      keyPoints: record.keyPoints,
      quiz: record.quiz,
      pdfUrl: record.pdfUrl,
      createdAt: record.createdAt,
    },
  });
}
