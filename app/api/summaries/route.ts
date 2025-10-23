import { NextResponse } from "next/server";

import SummaryModel from "@/models/Summary";
import { requireAuth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongoose";

export async function GET() {
  const { userId } = await requireAuth();
  await connectToDatabase();

  const summaries = await SummaryModel.find({ userId }).sort({ updatedAt: -1 });

  return NextResponse.json({
    summaries: summaries.map((summary) => ({
      id: summary._id.toString(),
      source: summary.source,
      originalText: summary.originalText,
      summary: summary.summary,
      keyPoints: summary.keyPoints,
      quiz: summary.quiz,
      pdfUrl: summary.pdfUrl,
      createdAt: summary.createdAt,
      updatedAt: summary.updatedAt,
    })),
  });
}
