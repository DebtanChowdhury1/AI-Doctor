import { NextResponse } from "next/server";

import { formatExamForPdf, generatePDF } from "@/lib/ai/gemini";
import { requireAuth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongoose";
import { uploadPdf } from "@/lib/cloudinary";
import ExamModel from "@/models/Exam";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const { userId } = await requireAuth();
  await connectToDatabase();

  const exam = await ExamModel.findOne({ _id: params.id, userId });
  if (!exam) {
    return NextResponse.json({ error: "Exam not found" }, { status: 404 });
  }

  const pdfBuffer = await generatePDF(formatExamForPdf(exam.topic, exam.questions));
  const url = await uploadPdf(pdfBuffer, `exam-${exam._id}`);
  exam.pdfUrl = url;
  await exam.save();

  return NextResponse.json({ url });
}
