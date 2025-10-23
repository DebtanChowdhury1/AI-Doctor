import { Suspense } from "react";

import { requireAuth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongoose";
import SummaryModel from "@/models/Summary";
import SummarizerClient from "./client";

export const dynamic = "force-dynamic";

async function loadSummaries(userId: string) {
  await connectToDatabase();
  const summaries = await SummaryModel.find({ userId }).sort({ updatedAt: -1 }).lean();

  return summaries.map((summary) => ({
    id: summary._id.toString(),
    source: summary.source,
    originalText: summary.originalText,
    summary: summary.summary,
    keyPoints: summary.keyPoints,
    quiz: summary.quiz,
    pdfUrl: summary.pdfUrl,
    createdAt: summary.createdAt?.toISOString(),
    updatedAt: summary.updatedAt?.toISOString(),
  }));
}

export default async function SummarizerPage() {
  const { userId } = await requireAuth();
  const summaries = await loadSummaries(userId);

  return (
    <Suspense>
      <SummarizerClient initialSummaries={summaries} />
    </Suspense>
  );
}
