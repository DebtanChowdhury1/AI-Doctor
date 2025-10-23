import { NextResponse } from "next/server";

import { formatSummaryPdf, generatePDF } from "@/lib/ai/gemini";
import { requireAuth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongoose";
import { uploadPdf } from "@/lib/cloudinary";
import SummaryModel from "@/models/Summary";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const { userId } = await requireAuth();
  await connectToDatabase();

  const summary = await SummaryModel.findOne({ _id: params.id, userId });
  if (!summary) {
    return NextResponse.json({ error: "Summary not found" }, { status: 404 });
  }

  const pdfBuffer = await generatePDF(
    formatSummaryPdf(summary.source, {
      summary: summary.summary,
      keyPoints: summary.keyPoints,
      quiz: summary.quiz,
    }),
  );

  const url = await uploadPdf(pdfBuffer, `summary-${summary._id}`);
  summary.pdfUrl = url;
  await summary.save();

  return NextResponse.json({ url });
}
